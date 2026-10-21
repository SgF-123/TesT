using System.Text.Json;
using System.Text.Json.Nodes;

namespace TesT.Shell;

internal static class PiConfigImporter
{
    public sealed record ImportResult(
        int Providers,
        bool Auth,
        bool Settings,
        string? Error,
        string Source);

    public static ImportResult Import(string sourceDir, string targetDir)
    {
        try
        {
            if (!Directory.Exists(sourceDir))
            {
                return new ImportResult(
                    0,
                    false,
                    false,
                    $"未找到 Pi 配置目录：{sourceDir}",
                    sourceDir);
            }

            Directory.CreateDirectory(targetDir);
            var providers = ImportProviders(sourceDir, targetDir);
            var auth = CopyAuth(sourceDir, targetDir);
            var settings = CopySettings(sourceDir, targetDir);

            if (providers == 0 && !auth && !settings)
            {
                return new ImportResult(
                    0,
                    false,
                    false,
                    "Pi 配置里没有可导入的渠道或登录凭证",
                    sourceDir);
            }

            return new ImportResult(providers, auth, settings, null, sourceDir);
        }
        catch (Exception ex)
        {
            return new ImportResult(0, false, false, ex.Message, sourceDir);
        }
    }

    private static int ImportProviders(string sourceDir, string targetDir)
    {
        var sourcePath = Path.Combine(sourceDir, "models.json");
        if (!File.Exists(sourcePath))
        {
            return 0;
        }

        var source = JsonNode.Parse(File.ReadAllText(sourcePath)) as JsonObject;
        if (source?["providers"] is not JsonObject sourceProviders)
        {
            return 0;
        }

        var targetPath = Path.Combine(targetDir, "models.json");
        JsonObject target;
        if (File.Exists(targetPath))
        {
            target =
                JsonNode.Parse(File.ReadAllText(targetPath)) as JsonObject
                ?? new JsonObject();
        }
        else
        {
            target = new JsonObject
            {
                ["$schema"] = "https://pi.dev/schemas/models.schema.json",
                ["providers"] = new JsonObject(),
            };
        }

        if (target["providers"] is not JsonObject targetProviders)
        {
            targetProviders = new JsonObject();
            target["providers"] = targetProviders;
        }

        var count = 0;
        foreach (var entry in sourceProviders)
        {
            targetProviders[entry.Key] = entry.Value?.DeepClone();
            count++;
        }

        File.WriteAllText(
            targetPath,
            target.ToJsonString(new JsonSerializerOptions { WriteIndented = true }));
        return count;
    }

    private static bool CopyAuth(string sourceDir, string targetDir)
    {
        var source = Path.Combine(sourceDir, "auth.json");
        if (!File.Exists(source))
        {
            return false;
        }

        try
        {
            var auth = JsonNode.Parse(File.ReadAllText(source)) as JsonObject;
            if (auth is null || auth.Count == 0)
            {
                return false;
            }
        }
        catch
        {
            return false;
        }

        var target = Path.Combine(targetDir, "auth.json");
        if (File.Exists(target))
        {
            File.Copy(target, target + ".bak", overwrite: true);
        }

        File.Copy(source, target, overwrite: true);
        return true;
    }

    private static bool CopySettings(string sourceDir, string targetDir)
    {
        var source = Path.Combine(sourceDir, "settings.json");
        if (!File.Exists(source))
        {
            return false;
        }

        var target = Path.Combine(targetDir, "settings.json");
        if (File.Exists(target))
        {
            return false;
        }

        File.Copy(source, target, overwrite: true);
        return true;
    }
}
