using System.Runtime.InteropServices;
using System.Text;

namespace TesT.Shell;

/// <summary>
/// Reads the Pi TUI console and injects /login once the startup banner is
/// gone. Attaching to the console is more reliable than global SendKeys: it
/// cannot type into TesT or another foreground window.
/// </summary>
internal static class PiConsole
{
    private const int StdInputHandle = -10;
    private const int StdOutputHandle = -11;
    private const ushort KeyEvent = 0x0001;

    public static async Task<bool> WaitAndLoginAsync(
        int processId,
        TimeSpan timeout)
    {
        var deadline = DateTime.UtcNow + timeout;
        var readySince = DateTime.MinValue;

        while (DateTime.UtcNow < deadline)
        {
            var text = ReadVisibleText(processId);
            if (text is not null)
            {
                var starting =
                    text.Contains("Startup is still in progress", StringComparison.OrdinalIgnoreCase) ||
                    text.Contains("Downloading", StringComparison.OrdinalIgnoreCase);
                var ready =
                    !starting &&
                    (text.Contains("No models available", StringComparison.OrdinalIgnoreCase) ||
                     text.Contains("/login", StringComparison.OrdinalIgnoreCase) ||
                     text.Contains("auto)", StringComparison.OrdinalIgnoreCase));

                if (ready)
                {
                    if (readySince == DateTime.MinValue)
                    {
                        readySince = DateTime.UtcNow;
                    }

                    // Give the editor one beat to take focus after the banner.
                    if ((DateTime.UtcNow - readySince).TotalMilliseconds > 700)
                    {
                        return SendText(processId, "/login\r");
                    }
                }
                else
                {
                    readySince = DateTime.MinValue;
                }
            }

            await Task.Delay(650);
        }

        return false;
    }

    private static string? ReadVisibleText(int processId)
    {
        FreeConsole();
        if (!AttachConsole((uint)processId))
        {
            return null;
        }

        try
        {
            var output = GetStdHandle(StdOutputHandle);
            if (output == IntPtr.Zero ||
                !GetConsoleScreenBufferInfo(output, out var info))
            {
                return null;
            }

            var width = info.Window.Right - info.Window.Left + 1;
            if (width <= 0 || info.Window.Bottom < info.Window.Top)
            {
                return null;
            }

            var builder = new StringBuilder();
            for (var row = info.Window.Top; row <= info.Window.Bottom; row++)
            {
                var line = new StringBuilder(width);
                var coord = new Coord
                {
                    X = info.Window.Left,
                    Y = row,
                };
                if (ReadConsoleOutputCharacter(
                    output,
                    line,
                    (uint)width,
                    coord,
                    out var read))
                {
                    builder.Append(line.ToString(0, (int)read));
                }

                builder.Append('\n');
            }

            return builder.ToString();
        }
        finally
        {
            FreeConsole();
        }
    }

    private static bool SendText(int processId, string text)
    {
        FreeConsole();
        if (!AttachConsole((uint)processId))
        {
            return false;
        }

        try
        {
            var input = GetStdHandle(StdInputHandle);
            if (input == IntPtr.Zero)
            {
                return false;
            }

            var records = new List<InputRecord>();
            foreach (var character in text)
            {
                var virtualKey = character == '\r'
                    ? (ushort)0x0D
                    : (ushort)(VkKeyScan(character) & 0xFF);
                var unicode = character == '\r' ? '\r' : character;

                records.Add(new InputRecord
                {
                    EventType = KeyEvent,
                    KeyEvent = new KeyEventRecord
                    {
                        KeyDown = 1,
                        RepeatCount = 1,
                        VirtualKeyCode = virtualKey,
                        UnicodeChar = unicode,
                    },
                });
                records.Add(new InputRecord
                {
                    EventType = KeyEvent,
                    KeyEvent = new KeyEventRecord
                    {
                        KeyDown = 0,
                        RepeatCount = 1,
                        VirtualKeyCode = virtualKey,
                        UnicodeChar = unicode,
                    },
                });
            }

            return WriteConsoleInput(
                input,
                records.ToArray(),
                (uint)records.Count,
                out _);
        }
        finally
        {
            FreeConsole();
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct Coord
    {
        public short X;
        public short Y;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct SmallRect
    {
        public short Left;
        public short Top;
        public short Right;
        public short Bottom;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct ConsoleScreenBufferInfo
    {
        public Coord Size;
        public Coord CursorPosition;
        public ushort Attributes;
        public SmallRect Window;
        public Coord MaximumWindowSize;
    }

    [StructLayout(LayoutKind.Explicit, CharSet = CharSet.Unicode)]
    private struct InputRecord
    {
        [FieldOffset(0)]
        public ushort EventType;

        [FieldOffset(4)]
        public KeyEventRecord KeyEvent;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct KeyEventRecord
    {
        public int KeyDown;
        public ushort RepeatCount;
        public ushort VirtualKeyCode;
        public ushort VirtualScanCode;
        public char UnicodeChar;
        public uint ControlKeyState;
    }

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool AttachConsole(uint processId);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool FreeConsole();

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr GetStdHandle(int handle);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool ReadConsoleOutputCharacter(
        IntPtr output,
        StringBuilder characters,
        uint length,
        Coord readCoord,
        out uint read);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool GetConsoleScreenBufferInfo(
        IntPtr output,
        out ConsoleScreenBufferInfo info);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool WriteConsoleInput(
        IntPtr input,
        InputRecord[] records,
        uint length,
        out uint written);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern short VkKeyScan(char character);
}
