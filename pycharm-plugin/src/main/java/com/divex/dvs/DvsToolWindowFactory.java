package com.divex.dvs;

import com.intellij.openapi.project.DumbAware;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.wm.ToolWindow;
import com.intellij.openapi.wm.ToolWindowFactory;
import com.intellij.ui.content.Content;
import com.intellij.ui.content.ContentFactory;
import org.jetbrains.annotations.NotNull;

public final class DvsToolWindowFactory implements ToolWindowFactory, DumbAware {
    @Override
    public void createToolWindowContent(
        @NotNull Project project,
        @NotNull ToolWindow toolWindow
    ) {
        DvsVisualizerPanel panel = new DvsVisualizerPanel(project);
        Content content = ContentFactory.getInstance().createContent(panel, "Visualizer", false);
        content.setDisposer(panel);
        toolWindow.getContentManager().addContent(content);
    }
}
