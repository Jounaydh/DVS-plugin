using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace DvsVisualizerInstaller
{
    internal sealed class InstallerForm : Form
    {
        private readonly Label statusLabel;
        private readonly ProgressBar progressBar;
        private readonly Button closeButton;

        public InstallerForm()
        {
            Text = "DVS Visualizer Setup";
            StartPosition = FormStartPosition.CenterScreen;
            ClientSize = new Size(520, 230);
            MinimumSize = new Size(520, 230);
            MaximizeBox = false;
            FormBorderStyle = FormBorderStyle.FixedDialog;
            BackColor = Color.FromArgb(20, 21, 25);
            ForeColor = Color.FromArgb(242, 242, 245);
            Font = new Font("Segoe UI", 9F, FontStyle.Regular, GraphicsUnit.Point);

            Label brand = new Label();
            brand.Text = "D";
            brand.TextAlign = ContentAlignment.MiddleCenter;
            brand.Font = new Font("Segoe UI", 18F, FontStyle.Bold, GraphicsUnit.Point);
            brand.BackColor = Color.FromArgb(94, 76, 224);
            brand.ForeColor = Color.White;
            brand.SetBounds(28, 26, 48, 48);
            Controls.Add(brand);

            Label title = new Label();
            title.Text = "DVS Visualizer for Visual Studio Code";
            title.AutoSize = true;
            title.Font = new Font("Segoe UI", 13F, FontStyle.Bold, GraphicsUnit.Point);
            title.SetBounds(92, 28, 390, 28);
            Controls.Add(title);

            Label version = new Label();
            version.Text = "Version 0.4.0 · Local workspace visualization";
            version.AutoSize = true;
            version.ForeColor = Color.FromArgb(145, 148, 158);
            version.SetBounds(94, 58, 370, 22);
            Controls.Add(version);

            statusLabel = new Label();
            statusLabel.Text = "Preparing installation…";
            statusLabel.AutoEllipsis = true;
            statusLabel.SetBounds(30, 108, 460, 24);
            Controls.Add(statusLabel);

            progressBar = new ProgressBar();
            progressBar.Style = ProgressBarStyle.Marquee;
            progressBar.MarqueeAnimationSpeed = 24;
            progressBar.SetBounds(30, 140, 460, 12);
            Controls.Add(progressBar);

            closeButton = new Button();
            closeButton.Text = "Close";
            closeButton.Enabled = false;
            closeButton.FlatStyle = FlatStyle.Flat;
            closeButton.FlatAppearance.BorderColor = Color.FromArgb(85, 87, 96);
            closeButton.BackColor = Color.FromArgb(45, 47, 54);
            closeButton.ForeColor = Color.White;
            closeButton.SetBounds(390, 176, 100, 32);
            closeButton.Click += delegate { Close(); };
            Controls.Add(closeButton);

            Shown += async delegate { await InstallAsync(); };
        }

        private async Task InstallAsync()
        {
            try
            {
                statusLabel.Text = "Installing DVS Visualizer in Visual Studio Code…";
                string result = await Task.Run(new Func<string>(InstallExtension));
                progressBar.Style = ProgressBarStyle.Continuous;
                progressBar.Value = 100;
                statusLabel.ForeColor = Color.FromArgb(123, 213, 154);
                statusLabel.Text = result;
                closeButton.Enabled = true;
                closeButton.Text = "Done";
            }
            catch (Exception error)
            {
                progressBar.Style = ProgressBarStyle.Continuous;
                progressBar.Value = 0;
                statusLabel.ForeColor = Color.FromArgb(235, 122, 128);
                statusLabel.Text = "Installation failed: " + error.Message;
                closeButton.Enabled = true;
            }
        }

        private static string InstallExtension()
        {
            string codeCommand = FindCodeCommand();
            if (codeCommand == null)
            {
                throw new InvalidOperationException(
                    "Visual Studio Code was not found. Install VS Code, then run this setup again."
                );
            }

            string tempDirectory = Path.Combine(
                Path.GetTempPath(),
                "DVS-Visualizer-" + Guid.NewGuid().ToString("N")
            );
            Directory.CreateDirectory(tempDirectory);
            string vsixPath = Path.Combine(tempDirectory, "dvs-visualizer-0.4.0.vsix");

            try
            {
                Assembly assembly = Assembly.GetExecutingAssembly();
                using (Stream source = assembly.GetManifestResourceStream("DVS.Visualizer.vsix"))
                {
                    if (source == null)
                    {
                        throw new InvalidOperationException("The bundled DVS extension is missing.");
                    }
                    using (FileStream destination = File.Create(vsixPath))
                    {
                        source.CopyTo(destination);
                    }
                }

                string commandProcessor = Environment.GetEnvironmentVariable("ComSpec");
                if (String.IsNullOrWhiteSpace(commandProcessor))
                {
                    commandProcessor = Path.Combine(
                        Environment.GetFolderPath(Environment.SpecialFolder.System),
                        "cmd.exe"
                    );
                }

                ProcessStartInfo startInfo = new ProcessStartInfo();
                startInfo.FileName = commandProcessor;
                startInfo.Arguments = "/d /s /c \"\"" + codeCommand +
                    "\" --install-extension \"" + vsixPath + "\" --force\"";
                startInfo.UseShellExecute = false;
                startInfo.CreateNoWindow = true;
                startInfo.RedirectStandardOutput = true;
                startInfo.RedirectStandardError = true;

                using (Process process = Process.Start(startInfo))
                {
                    string output = process.StandardOutput.ReadToEnd();
                    string error = process.StandardError.ReadToEnd();
                    process.WaitForExit();
                    if (process.ExitCode != 0)
                    {
                        string detail = String.IsNullOrWhiteSpace(error) ? output : error;
                        throw new InvalidOperationException(detail.Trim());
                    }
                }
            }
            finally
            {
                try { Directory.Delete(tempDirectory, true); }
                catch { }
            }

            return "Installed successfully. Reload VS Code, then select DVS on the left.";
        }

        private static string FindCodeCommand()
        {
            string localAppData = Environment.GetFolderPath(
                Environment.SpecialFolder.LocalApplicationData
            );
            string programFiles = Environment.GetFolderPath(
                Environment.SpecialFolder.ProgramFiles
            );
            string programFilesX86 = Environment.GetFolderPath(
                Environment.SpecialFolder.ProgramFilesX86
            );
            string[] candidates = new string[]
            {
                Path.Combine(localAppData, "Programs", "Microsoft VS Code", "bin", "code.cmd"),
                Path.Combine(programFiles, "Microsoft VS Code", "bin", "code.cmd"),
                Path.Combine(programFilesX86, "Microsoft VS Code", "bin", "code.cmd")
            };

            foreach (string candidate in candidates)
            {
                if (File.Exists(candidate)) return candidate;
            }

            string pathValue = Environment.GetEnvironmentVariable("PATH") ?? String.Empty;
            foreach (string directory in pathValue.Split(Path.PathSeparator))
            {
                if (String.IsNullOrWhiteSpace(directory)) continue;
                string candidate = Path.Combine(directory.Trim(), "code.cmd");
                if (File.Exists(candidate)) return candidate;
            }
            return null;
        }
    }

    internal static class Program
    {
        [STAThread]
        private static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new InstallerForm());
        }
    }
}
