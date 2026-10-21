using System.Diagnostics;
using System.Text.Json.Nodes;

namespace TesT.Shell;

internal static class PiLogin
{
    public sealed record AuthStatus(
        IReadOnlyList<string> Providers,
        IReadOnlyList<string> OAuthProviders);

    public static Process? OpenTerminal()
    {
        if (!File.Exists(Paths.PiCli))
        {
            return null;
        }

        var command =
            "/k chcp 65001 >nul" +
            " & title Pi Login" +
            $" & set \"PI_CODING_AGENT_DIR={Paths.PiDataDir}\"" +
            " & set \"PI_SKIP_VERSION_CHECK=1\"" +
            " & echo." +
            " & echo  ============================================" +
            " & echo   Pi 登录 / Provider Login" +
            " & echo   1. 如果没有自动进入登录，输入: /login" +
            " & echo   2. 选择 Claude / OpenAI / Gemini 等服务商" +
            " & echo   3. 登录完成后关闭这个窗口" +
            " & echo  ============================================" +
            " & echo." +
            $" & node \"{Paths.PiCli}\"";

        try
        {
            return Process.Start(new ProcessStartInfo
            {
                FileName = "cmd.exe",
                Arguments = command,
                WorkingDirectory = Paths.PiWorkDir,
                UseShellExecute = true,
            });
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Wait for the Pi TUI to finish startup, then inject /login directly into
    /// its console input buffer. This cannot leak keystrokes into TesT.
    /// </summary>
    public static async Task TryTypeLoginAsync(Process process)
    {
        try
        {
            await Task.Delay(800);
            await PiConsole.WaitAndLoginAsync(
                process.Id,
                TimeSpan.FromSeconds(120));
        }
        catch
        {
            // The user can always type /login manually.
        }
    }

    public static AuthStatus ReadStatus()
    {
        var providers = new List<string>();
        var oauth = new List<string>();
        var path = Path.Combine(Paths.PiDataDir, "auth.json");

        try
        {
            if (File.Exists(path) &&
                JsonNode.Parse(File.ReadAllText(path)) is JsonObject root)
            {
                foreach (var entry in root)
                {
                    providers.Add(entry.Key);
                    if (entry.Value is JsonObject credential &&
                        credential["type"] is JsonValue typeValue &&
                        typeValue.TryGetValue<string>(out var type) &&
                        string.Equals(type, "oauth", StringComparison.OrdinalIgnoreCase))
                    {
                        oauth.Add(entry.Key);
                    }
                }
            }
        }
        catch
        {
            // Status is best-effort.
        }

        providers.Sort(StringComparer.OrdinalIgnoreCase);
        oauth.Sort(StringComparer.OrdinalIgnoreCase);
        return new AuthStatus(providers, oauth);
    }
}
