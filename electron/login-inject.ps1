param([int]$ProcessId)

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class PiLoginWindow
{
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@

$deadline = (Get-Date).AddSeconds(120)
while ((Get-Date) -lt $deadline) {
    try {
        $process = Get-Process -Id $ProcessId -ErrorAction Stop
        $handle = $process.MainWindowHandle
        if ($handle -ne [IntPtr]::Zero) {
            $window = [System.Windows.Automation.AutomationElement]::FromHandle($handle)
            $walker = [System.Windows.Automation.TreeWalker]::ControlViewWalker
            $document = $walker.GetFirstChild($window)
            if ($null -ne $document) {
                $pattern = $document.GetCurrentPattern(
                    [System.Windows.Automation.TextPattern]::Pattern
                )
                $text = $pattern.DocumentRange.GetText(-1)
                if (
                    $text -and
                    $text -notmatch "Startup is still in progress" -and
                    $text -match "No models available|auto\)"
                ) {
                    [void][PiLoginWindow]::SetForegroundWindow($handle)
                    Start-Sleep -Milliseconds 400
                    $shell = New-Object -ComObject WScript.Shell
                    [void]$shell.AppActivate($ProcessId)
                    Start-Sleep -Milliseconds 300
                    $shell.SendKeys("/login{ENTER}")
                    exit 0
                }
            }
        }
    } catch {
        # The console may not be ready yet.
    }

    Start-Sleep -Milliseconds 700
}

exit 1
