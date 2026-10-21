using System.Diagnostics;
using System.Text;

namespace TesT.Shell;

internal sealed class PiBridge : IDisposable
{
    private readonly string _cli;
    private readonly string _workingDirectory;
    private readonly string _dataDirectory;
    private Process? _process;
    private bool _announcedReady;

    public PiBridge(string cli, string workingDirectory, string dataDirectory)
    {
        _cli = cli;
        _workingDirectory = workingDirectory;
        _dataDirectory = dataDirectory;
    }

    public event Action<string>? RecordReceived;
    public event Action<string>? StatusChanged;
    public event Action<string>? LogReceived;

    public void Start()
    {
        if (!File.Exists(_cli))
        {
            StatusChanged?.Invoke("error");
            LogReceived?.Invoke($"Pi CLI not found: {_cli}");
            return;
        }

        Directory.CreateDirectory(_dataDirectory);
        var sessionsDirectory = Path.Combine(_dataDirectory, "sessions");
        Directory.CreateDirectory(sessionsDirectory);
        var hasSessions =
            Directory.Exists(sessionsDirectory) &&
            Directory.GetFiles(sessionsDirectory, "*.jsonl").Length > 0;

        var arguments =
            $"\"{_cli}\" --mode rpc --session-dir \"{sessionsDirectory}\"";
        if (hasSessions)
        {
            arguments += " --continue";
        }

        var startInfo = new ProcessStartInfo
        {
            FileName = "node",
            Arguments = arguments,
            WorkingDirectory = _workingDirectory,
            UseShellExecute = false,
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true,
            StandardOutputEncoding = Encoding.UTF8,
            StandardErrorEncoding = Encoding.UTF8,
            StandardInputEncoding = Encoding.UTF8,
        };

        startInfo.Environment["PI_CODING_AGENT_DIR"] = _dataDirectory;
        startInfo.Environment["PI_SKIP_VERSION_CHECK"] = "1";
        startInfo.Environment["NO_COLOR"] = "1";

        try
        {
            _process = new Process
            {
                StartInfo = startInfo,
                EnableRaisingEvents = true,
            };
            _process.OutputDataReceived += (_, args) =>
            {
                if (string.IsNullOrWhiteSpace(args.Data))
                {
                    return;
                }

                if (!_announcedReady)
                {
                    _announcedReady = true;
                    StatusChanged?.Invoke("ready");
                }

                RecordReceived?.Invoke(args.Data);
            };
            _process.ErrorDataReceived += (_, args) =>
            {
                if (!string.IsNullOrWhiteSpace(args.Data))
                {
                    LogReceived?.Invoke(args.Data);
                }
            };
            _process.Exited += (_, _) => StatusChanged?.Invoke("exited");

            _process.Start();
            _process.BeginOutputReadLine();
            _process.BeginErrorReadLine();
            StatusChanged?.Invoke("starting");
        }
        catch (Exception ex)
        {
            StatusChanged?.Invoke("error");
            LogReceived?.Invoke(ex.Message);
        }
    }

    public void Send(string json)
    {
        if (_process is null || _process.HasExited)
        {
            return;
        }

        try
        {
            _process.StandardInput.WriteLine(json);
            _process.StandardInput.Flush();
        }
        catch (Exception ex)
        {
            LogReceived?.Invoke(ex.Message);
        }
    }

    public void Restart()
    {
        Dispose();
        _announcedReady = false;
        Start();
    }

    public void Dispose()
    {
        try
        {
            _process?.StandardInput.Close();
        }
        catch
        {
            // ignored
        }

        try
        {
            if (_process is { HasExited: false })
            {
                if (!_process.WaitForExit(1500))
                {
                    _process.Kill(true);
                }
            }
        }
        catch
        {
            // ignored
        }

        _process?.Dispose();
        _process = null;
    }
}
