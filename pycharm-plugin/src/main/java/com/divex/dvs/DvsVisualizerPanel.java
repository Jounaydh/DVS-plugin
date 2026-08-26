package com.divex.dvs;

import com.google.gson.Gson;
import com.intellij.openapi.Disposable;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.fileEditor.FileEditorManager;
import com.intellij.openapi.fileEditor.OpenFileDescriptor;
import com.intellij.openapi.progress.ProgressIndicator;
import com.intellij.openapi.progress.ProgressManager;
import com.intellij.openapi.progress.Task;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.LocalFileSystem;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.ui.components.JBLabel;
import com.intellij.ui.jcef.JBCefApp;
import com.intellij.ui.jcef.JBCefBrowser;
import com.intellij.ui.jcef.JBCefBrowserBase;
import com.intellij.ui.jcef.JBCefJSQuery;
import com.intellij.util.ui.JBUI;
import org.jetbrains.annotations.NotNull;

import javax.swing.BorderFactory;
import javax.swing.JPanel;
import java.awt.BorderLayout;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

public final class DvsVisualizerPanel extends JPanel implements Disposable {
    private static final int MAX_FILES = 750;
    private static final long MAX_FILE_BYTES = 2L * 1024L * 1024L;
    private static final Set<String> INCLUDED_EXTENSIONS = new HashSet<String>(Arrays.asList(
        "ts", "tsx", "js", "jsx", "mjs", "cjs", "py", "pyw", "dart",
        "java", "html", "htm", "css", "sql", "json", "yaml", "yml",
        "md", "xml", "toml", "properties", "gradle"
    ));
    private static final Set<String> EXCLUDED_DIRECTORIES = new HashSet<String>(Arrays.asList(
        ".git", "node_modules", "dist", "build", "out", "target", "coverage",
        ".venv", "venv", "__pycache__", ".dart_tool", ".gradle", ".idea",
        ".next", ".cache"
    ));

    private final Project project;
    private final Gson gson = new Gson();
    private JBCefBrowser browser;
    private JBCefJSQuery bridgeQuery;

    public DvsVisualizerPanel(@NotNull Project project) {
        super(new BorderLayout());
        this.project = project;
        setBorder(BorderFactory.createEmptyBorder());

        if (!JBCefApp.isSupported()) {
            JBLabel unsupported = new JBLabel(
                "DVS requires the JetBrains Runtime embedded browser (JCEF).",
                JBLabel.CENTER
            );
            unsupported.setBorder(JBUI.Borders.empty(20));
            add(unsupported, BorderLayout.CENTER);
            return;
        }

        browser = new JBCefBrowser();
        bridgeQuery = JBCefJSQuery.create((JBCefBrowserBase) browser);
        bridgeQuery.addHandler(message -> {
            handleHostMessage(message);
            return null;
        });
        add(browser.getComponent(), BorderLayout.CENTER);
        browser.loadHTML(buildHtml());
    }

    private String buildHtml() {
        String template = readResource("/webview/index.html");
        String css = readResource("/webview/main.css");
        String javascript = readResource("/webview/main.js");
        String postMessageInjection = bridgeQuery.inject("JSON.stringify(message)");
        String bridge =
            "(function(){var savedState=null;window.acquireVsCodeApi=function(){return{" +
            "postMessage:function(message){" + postMessageInjection + "}," +
            "getState:function(){return savedState;}," +
            "setState:function(state){savedState=state;return state;}" +
            "};};})();";
        return template
            .replace("__DVS_CSS__", css)
            .replace("__DVS_BRIDGE__", bridge)
            .replace("__DVS_JS__", javascript);
    }

    private String readResource(String path) {
        try (InputStream stream = DvsVisualizerPanel.class.getResourceAsStream(path)) {
            if (stream == null) throw new IllegalStateException("Missing plugin resource: " + path);
            return new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException error) {
            throw new IllegalStateException("Unable to load " + path, error);
        }
    }

    private void handleHostMessage(String rawMessage) {
        HostMessage message;
        try {
            message = gson.fromJson(rawMessage, HostMessage.class);
        } catch (RuntimeException ignored) {
            return;
        }
        if (message == null || message.type == null) return;

        if ("ready".equals(message.type)) {
            sendMessage(configurationMessage());
            refreshProject();
        } else if ("refresh".equals(message.type)) {
            refreshProject();
        } else if ("openSource".equals(message.type) && message.path != null) {
            openSource(message.path, message.line == null ? 1 : message.line.intValue());
        }
    }

    private Map<String, Object> configurationMessage() {
        Map<String, Object> configuration = new HashMap<String, Object>();
        configuration.put("type", "configure");
        configuration.put("viewMode", "2d");
        configuration.put("direction", "top-down");
        return configuration;
    }

    private void refreshProject() {
        Map<String, Object> loading = new HashMap<String, Object>();
        loading.put("type", "loading");
        sendMessage(loading);

        ProgressManager.getInstance().run(new Task.Backgroundable(
            project,
            "DVS is analyzing the project",
            true
        ) {
            private Map<String, Object> workspaceMessage;
            private String failure;

            @Override
            public void run(@NotNull ProgressIndicator indicator) {
                try {
                    workspaceMessage = buildWorkspaceMessage(indicator);
                } catch (Exception error) {
                    failure = error.getMessage() == null ? error.toString() : error.getMessage();
                }
            }

            @Override
            public void onSuccess() {
                if (failure != null) sendError(failure);
                else if (workspaceMessage != null) sendMessage(workspaceMessage);
            }
        });
    }

    private Map<String, Object> buildWorkspaceMessage(ProgressIndicator indicator) throws IOException {
        String basePath = project.getBasePath();
        if (basePath == null) throw new IOException("Open a project before starting DVS.");
        Path root = Paths.get(basePath).toAbsolutePath().normalize();
        long startedAt = System.currentTimeMillis();
        List<ProjectFile> projectFiles = new ArrayList<ProjectFile>();
        boolean truncated = false;

        try (Stream<Path> paths = Files.walk(root)) {
            java.util.Iterator<Path> iterator = paths.iterator();
            while (iterator.hasNext()) {
                if (indicator.isCanceled()) throw new IOException("Project scan was cancelled.");
                Path path = iterator.next();
                if (!Files.isRegularFile(path) || !shouldInclude(root, path)) continue;
                if (projectFiles.size() >= MAX_FILES) {
                    truncated = true;
                    break;
                }
                try {
                    if (Files.size(path) > MAX_FILE_BYTES) continue;
                    String relative = normalize(root.relativize(path).toString());
                    String content = Files.readString(path, StandardCharsets.UTF_8);
                    projectFiles.add(new ProjectFile(relative, content));
                    indicator.setText2(relative);
                    indicator.setFraction(Math.min(0.98, projectFiles.size() / (double) MAX_FILES));
                } catch (IOException ignored) {
                    // Files that disappear or cannot be decoded during a scan are skipped.
                }
            }
        }
        Collections.sort(projectFiles, Comparator.comparing(file -> file.path));

        Map<String, Object> payload = new HashMap<String, Object>();
        payload.put("name", project.getName());
        payload.put("rootPath", root.toString());
        payload.put("files", projectFiles);
        payload.put("folders", collectFolders(projectFiles));
        Map<String, Object> environment = new HashMap<String, Object>();
        environment.put("kind", "native");
        environment.put("platform", System.getProperty("os.name", "unknown"));
        payload.put("environment", environment);
        Map<String, Object> summary = new HashMap<String, Object>();
        summary.put("totalFiles", projectFiles.size());
        summary.put("cachedFiles", 0);
        summary.put("readFiles", projectFiles.size());
        summary.put("durationMs", System.currentTimeMillis() - startedAt);
        payload.put("loadSummary", summary);
        payload.put("truncated", truncated);

        Map<String, Object> message = new HashMap<String, Object>();
        message.put("type", "workspace");
        message.put("payload", payload);
        return message;
    }

    private boolean shouldInclude(Path root, Path path) {
        Path relative = root.relativize(path);
        for (Path segment : relative) {
            if (EXCLUDED_DIRECTORIES.contains(segment.toString())) return false;
        }
        String name = path.getFileName().toString();
        int dot = name.lastIndexOf('.');
        String extension = dot >= 0 ? name.substring(dot + 1).toLowerCase() : "";
        return INCLUDED_EXTENSIONS.contains(extension);
    }

    private List<String> collectFolders(List<ProjectFile> files) {
        Set<String> folders = new HashSet<String>();
        for (ProjectFile file : files) {
            String[] parts = file.path.split("/");
            String current = "";
            for (int index = 0; index < parts.length - 1; index++) {
                current = current.length() == 0 ? parts[index] : current + "/" + parts[index];
                folders.add(current);
            }
        }
        List<String> sorted = new ArrayList<String>(folders);
        Collections.sort(sorted);
        return sorted;
    }

    private static String normalize(String value) {
        return value.replace('\\', '/').replaceAll("/{2,}", "/");
    }

    private void openSource(String relativePath, int lineNumber) {
        String basePath = project.getBasePath();
        if (basePath == null) return;
        Path root = Paths.get(basePath).toAbsolutePath().normalize();
        Path target = root.resolve(relativePath.replace('/', java.io.File.separatorChar)).normalize();
        if (!target.startsWith(root)) return;

        ApplicationManager.getApplication().invokeLater(() -> {
            VirtualFile file = LocalFileSystem.getInstance().refreshAndFindFileByNioFile(target);
            if (file == null) return;
            OpenFileDescriptor descriptor = new OpenFileDescriptor(
                project,
                file,
                Math.max(0, lineNumber - 1),
                0
            );
            FileEditorManager.getInstance(project).openTextEditor(descriptor, true);
        });
    }

    private void sendError(String detail) {
        Map<String, Object> error = new HashMap<String, Object>();
        error.put("type", "error");
        error.put("message", detail);
        sendMessage(error);
    }

    private void sendMessage(Object message) {
        if (browser == null) return;
        String serialized = gson.toJson(message);
        ApplicationManager.getApplication().invokeLater(() -> {
            if (browser == null) return;
            String url = browser.getCefBrowser().getURL();
            browser.getCefBrowser().executeJavaScript(
                "window.postMessage(" + serialized + ", '*');",
                url,
                0
            );
        });
    }

    @Override
    public void dispose() {
        if (bridgeQuery != null) {
            bridgeQuery.dispose();
            bridgeQuery = null;
        }
        if (browser != null) {
            browser.dispose();
            browser = null;
        }
    }

    private static final class HostMessage {
        String type;
        String path;
        Integer line;
    }

    private static final class ProjectFile {
        final String path;
        final String content;

        ProjectFile(String path, String content) {
            this.path = path;
            this.content = content;
        }
    }
}
