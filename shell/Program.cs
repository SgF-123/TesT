using System.Runtime.InteropServices;
using System.Threading;

namespace TesT.Shell;

static class Program
{
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern IntPtr FindWindow(string? className, string windowName);

    [DllImport("user32.dll")]
    private static extern bool SetForegroundWindow(IntPtr window);

    [STAThread]
    static void Main()
    {
        using var mutex = new Mutex(
            initiallyOwned: true,
            name: @"Local\TesT.Desktop.SingleInstance",
            createdNew: out var createdNew);

        if (!createdNew)
        {
            var existing = FindWindow(null, "TesT");
            if (existing != IntPtr.Zero)
            {
                SetForegroundWindow(existing);
            }

            return;
        }

        ApplicationConfiguration.Initialize();
        Application.Run(new MainForm());
    }
}
