namespace TesT.Shell;

internal static class Paths
{
    public static string ProjectRoot => FindProjectRoot();

    public static string DistDir => Path.Combine(ProjectRoot, "tesT", "dist");

    public static string DataDir
    {
        get
        {
            var devDir = Path.Combine(ProjectRoot, "tesT", "data");
            if (Directory.Exists(Path.Combine(ProjectRoot, "tesT")))
            {
                Directory.CreateDirectory(devDir);
                return devDir;
            }

            var appDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "TesT");
            Directory.CreateDirectory(appDir);
            return appDir;
        }
    }

    public static string PiCli
    {
        get
        {
            var candidate = Path.Combine(
                ProjectRoot,
                "pi",
                "packages",
                "coding-agent",
                "dist",
                "bundle",
                "cli.js");
            if (File.Exists(candidate))
            {
                return candidate;
            }

            var configured = Environment.GetEnvironmentVariable("TEST_PI_CLI");
            return !string.IsNullOrWhiteSpace(configured) ? configured : candidate;
        }
    }

    public static string PiWorkDir => ProjectRoot;

    public static string PiDataDir
    {
        get
        {
            var dir = Path.Combine(DataDir, "pi-agent");
            Directory.CreateDirectory(dir);
            return dir;
        }
    }

    public static string PiNativeAgentDir
    {
        get
        {
            var overrideDir = Environment.GetEnvironmentVariable("TEST_PI_AGENT_DIR");
            if (!string.IsNullOrWhiteSpace(overrideDir))
            {
                return overrideDir;
            }

            return Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
                ".pi",
                "agent");
        }
    }

    public static string? FindCcConfig()
    {
        var overridePath = Environment.GetEnvironmentVariable("TEST_CC_CONFIG");
        if (!string.IsNullOrWhiteSpace(overridePath) && File.Exists(overridePath))
        {
            return overridePath;
        }

        var candidates = new[]
        {
            Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
                ".cc-switch",
                "cc-switch.db"),
            Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "com.ccswitch.desktop",
                "cc-switch.db"),
            Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "com.ccswitch.desktop",
                "cc-switch.db"),
            Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "cc-switch",
                "cc-switch.db"),
            Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "com.ccswitch.desktop",
                "config.json"),
            Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "cc-switch",
                "config.json"),
            Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
                ".cc-switch",
                "config.json"),
        };

        return candidates.FirstOrDefault(File.Exists);
    }

    private static string FindProjectRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null)
        {
            var piBundle = Path.Combine(
                directory.FullName,
                "pi",
                "packages",
                "coding-agent",
                "dist",
                "bundle",
                "cli.js");
            if (File.Exists(piBundle))
            {
                return directory.FullName;
            }

            directory = directory.Parent;
        }

        return Environment.CurrentDirectory;
    }
}
