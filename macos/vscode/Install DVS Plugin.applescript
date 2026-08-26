on run
  set vsixFile to POSIX path of (path to resource "dvs-visualizer-0.4.0.vsix")
  set codeCandidates to {¬
    "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code", ¬
    (POSIX path of (path to home folder)) & "Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"}

  repeat with candidate in codeCandidates
    try
      do shell script quoted form of (contents of candidate) & " --install-extension " & quoted form of vsixFile & " --force"
      display dialog "DVS Plugin 0.4.0 was installed in Visual Studio Code." buttons {"Done"} default button "Done" with title "DVS Plugin"
      return
    end try
  end repeat

  display alert "Visual Studio Code was not found" message "Install Visual Studio Code in Applications, then run this installer again."
end run
