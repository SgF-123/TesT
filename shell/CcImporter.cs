using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Microsoft.Data.Sqlite;

namespace TesT.Shell;

internal static class CcImporter
{
    public sealed record ImportResult(
        int Imported,
        IReadOnlyList<string> Names,
        string? Error);

    public sealed record SaveProviderResult(string? Key, string? Error);

    public static ImportResult Import(string ccConfigPath, string piModelsPath)
    {
        try
        {
            var root = IsSqlite(ccConfigPath)
                ? LoadDatabaseRoot(ccConfigPath)
                : JsonNode.Parse(File.ReadAllText(ccConfigPath)) as JsonObject;
            if (root is null)
            {
                return new ImportResult(0, Array.Empty<string>(), "CC Switch 配置不是 JSON 对象");
            }

            var imported = new JsonObject();
            var names = new List<string>();

            ImportPi(root, imported, names);
            ImportClaude(root, imported, names);
            ImportCodex(root, imported, names);
            ImportGemini(root, imported, names);

            if (imported.Count == 0)
            {
                return new ImportResult(0, names, "没有找到可导入的渠道");
            }

            JsonObject document;
            if (File.Exists(piModelsPath))
            {
                document =
                    JsonNode.Parse(File.ReadAllText(piModelsPath)) as JsonObject
                    ?? new JsonObject();
            }
            else
            {
                document = new JsonObject
                {
                    ["$schema"] = "https://pi.dev/schemas/models.schema.json",
                    ["providers"] = new JsonObject(),
                };
            }

            if (document["providers"] is not JsonObject providers)
            {
                providers = new JsonObject();
                document["providers"] = providers;
            }

            foreach (var entry in imported)
            {
                providers[entry.Key] = entry.Value?.DeepClone();
            }

            var directory = Path.GetDirectoryName(piModelsPath);
            if (!string.IsNullOrWhiteSpace(directory))
            {
                Directory.CreateDirectory(directory);
            }

            File.WriteAllText(
                piModelsPath,
                document.ToJsonString(new JsonSerializerOptions { WriteIndented = true }));

            return new ImportResult(imported.Count, names, null);
        }
        catch (Exception ex)
        {
            return new ImportResult(0, Array.Empty<string>(), ex.Message);
        }
    }

    public static SaveProviderResult SaveProvider(
        string piModelsPath,
        JsonObject provider)
    {
        try
        {
            var key = GetString(provider, "key");
            var name = GetString(provider, "name");
            var baseUrl = GetString(provider, "baseUrl").TrimEnd('/');
            var api = GetString(provider, "api");
            var apiKey = GetString(provider, "apiKey");
            var models = provider["models"] as JsonArray;

            if (string.IsNullOrWhiteSpace(key) ||
                string.IsNullOrWhiteSpace(name) ||
                string.IsNullOrWhiteSpace(baseUrl) ||
                string.IsNullOrWhiteSpace(api) ||
                string.IsNullOrWhiteSpace(apiKey))
            {
                return new SaveProviderResult(null, "渠道信息不完整");
            }

            if (models is null || models.Count == 0)
            {
                return new SaveProviderResult(null, "预设没有可用模型");
            }

            models = NormalizeModels(models);
            if (models.Count == 0)
            {
                return new SaveProviderResult(
                    null,
                    "预设没有可写入 Pi 的模型，请先自动拉取模型或手动填写模型 ID");
            }

            JsonObject document;
            if (File.Exists(piModelsPath))
            {
                document =
                    JsonNode.Parse(File.ReadAllText(piModelsPath)) as JsonObject
                    ?? new JsonObject();
            }
            else
            {
                document = new JsonObject
                {
                    ["$schema"] = "https://pi.dev/schemas/models.schema.json",
                    ["providers"] = new JsonObject(),
                };
            }

            if (document["providers"] is not JsonObject providers)
            {
                providers = new JsonObject();
                document["providers"] = providers;
            }

            var savedKey = "cc-preset-" + Sanitize(key);
            var node = new JsonObject
            {
                ["name"] = name,
                ["baseUrl"] = baseUrl,
                ["api"] = api,
                ["apiKey"] = apiKey,
                ["models"] = models.DeepClone(),
            };
            if (provider["headers"] is JsonObject headers)
            {
                node["headers"] = headers.DeepClone();
            }
            if (provider["compat"] is JsonObject compat)
            {
                node["compat"] = compat.DeepClone();
            }

            providers[savedKey] = node;
            var directory = Path.GetDirectoryName(piModelsPath);
            if (!string.IsNullOrWhiteSpace(directory))
            {
                Directory.CreateDirectory(directory);
            }

            File.WriteAllText(
                piModelsPath,
                document.ToJsonString(new JsonSerializerOptions { WriteIndented = true }));
            return new SaveProviderResult(savedKey, null);
        }
        catch (Exception ex)
        {
            return new SaveProviderResult(null, ex.Message);
        }
    }

    private static JsonArray NormalizeModels(JsonArray models)
    {
        var result = new JsonArray();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var item in models)
        {
            if (item is not JsonObject source)
            {
                if (item is JsonValue value &&
                    value.TryGetValue<string>(out var text) &&
                    !string.IsNullOrWhiteSpace(text) &&
                    seen.Add(text.Trim()))
                {
                    result.Add(new JsonObject
                    {
                        ["id"] = text.Trim(),
                        ["name"] = text.Trim(),
                    });
                }

                continue;
            }

            var id = GetString(source, "id").Trim();
            if (id.Length == 0)
            {
                id = GetString(source, "name").Trim();
            }

            if (id.Length == 0 || !seen.Add(id))
            {
                continue;
            }

            var name = GetString(source, "name").Trim();
            var model = new JsonObject
            {
                ["id"] = id,
                ["name"] = name.Length > 0 ? name : id,
            };

            if (source["reasoning"] is JsonValue reasoningValue &&
                reasoningValue.TryGetValue<bool>(out var reasoning))
            {
                model["reasoning"] = reasoning;
            }

            if (source["input"] is JsonArray input)
            {
                var modalities = new JsonArray();
                foreach (var modality in input)
                {
                    if (modality is JsonValue modalityValue &&
                        modalityValue.TryGetValue<string>(out var text) &&
                        (text == "text" || text == "image") &&
                        !modalities.Any(existing =>
                            existing?.GetValue<string>() == text))
                    {
                        modalities.Add(text);
                    }
                }

                if (modalities.Count > 0)
                {
                    model["input"] = modalities;
                }
            }

            if (TryGetPositiveNumber(source, "contextWindow", out var contextWindow))
            {
                model["contextWindow"] = contextWindow;
            }

            if (TryGetPositiveNumber(source, "maxTokens", out var maxTokens))
            {
                model["maxTokens"] = maxTokens;
            }

            if (source["cost"] is JsonObject cost &&
                TryGetNumber(cost, "input", out var inputCost) &&
                TryGetNumber(cost, "output", out var outputCost) &&
                TryGetNumber(cost, "cacheRead", out var cacheRead) &&
                TryGetNumber(cost, "cacheWrite", out var cacheWrite))
            {
                model["cost"] = new JsonObject
                {
                    ["input"] = inputCost,
                    ["output"] = outputCost,
                    ["cacheRead"] = cacheRead,
                    ["cacheWrite"] = cacheWrite,
                };
            }

            result.Add(model);
        }

        return result;
    }

    private static bool TryGetPositiveNumber(
        JsonObject source,
        string key,
        out double value)
    {
        value = 0;
        return source[key] is JsonValue node &&
            node.TryGetValue<double>(out value) &&
            value > 0;
    }

    private static bool TryGetNumber(
        JsonObject source,
        string key,
        out double value)
    {
        value = 0;
        return source[key] is JsonValue node &&
            node.TryGetValue<double>(out value) &&
            value >= 0;
    }

    private static bool IsSqlite(string path)
    {
        return string.Equals(
            Path.GetExtension(path),
            ".db",
            StringComparison.OrdinalIgnoreCase);
    }

    private static JsonObject LoadDatabaseRoot(string path)
    {
        var root = new JsonObject();
        using var connection = new SqliteConnection(
            $"Data Source={path};Mode=ReadOnly");
        connection.Open();

        using var command = connection.CreateCommand();
        command.CommandText =
            "SELECT id, app_type, name, settings_config FROM providers";
        using var reader = command.ExecuteReader();

        while (reader.Read())
        {
            var id = reader.GetString(0);
            var appType = reader.GetString(1);
            var name = reader.GetString(2);
            var settingsText = reader.GetString(3);

            JsonNode? settings;
            try
            {
                settings = JsonNode.Parse(settingsText);
            }
            catch
            {
                continue;
            }

            if (settings is not JsonObject)
            {
                continue;
            }

            var sectionKey = appType switch
            {
                "claude-desktop" => "claude",
                _ => appType,
            };
            if (root[sectionKey] is not JsonObject section)
            {
                section = new JsonObject { ["providers"] = new JsonObject() };
                root[sectionKey] = section;
            }

            if (section["providers"] is not JsonObject providers)
            {
                providers = new JsonObject();
                section["providers"] = providers;
            }

            providers[id] = new JsonObject
            {
                ["id"] = id,
                ["name"] = name,
                ["settingsConfig"] = settings,
            };
        }

        return root;
    }

    private static void ImportPi(
        JsonObject root,
        JsonObject target,
        List<string> names)
    {
        if (root["pi"]?["providers"] is not JsonObject providers)
        {
            return;
        }

        foreach (var entry in providers)
        {
            var provider = entry.Value as JsonObject;
            var config =
                provider?["settingsConfig"] as JsonObject
                ?? provider;
            if (config?["models"] is not JsonArray models || models.Count == 0)
            {
                continue;
            }

            var clone = config.DeepClone() as JsonObject;
            if (clone is null)
            {
                continue;
            }

            var name = GetString(clone, "name");
            if (string.IsNullOrWhiteSpace(name))
            {
                name = GetString(provider, "name");
            }
            if (string.IsNullOrWhiteSpace(name))
            {
                name = entry.Key;
            }

            clone["name"] = name;
            target["cc-pi-" + Sanitize(entry.Key)] = clone;
            names.Add(name);
        }
    }

    private static void ImportClaude(
        JsonObject root,
        JsonObject target,
        List<string> names)
    {
        if (root["claude"]?["providers"] is not JsonObject providers)
        {
            return;
        }

        foreach (var entry in providers)
        {
            var provider = entry.Value as JsonObject;
            var env = provider?["settingsConfig"]?["env"] as JsonObject;
            if (env is null)
            {
                continue;
            }

            var baseUrl = GetString(env, "ANTHROPIC_BASE_URL").TrimEnd('/');
            var apiKey = FirstNonEmpty(
                GetString(env, "ANTHROPIC_AUTH_TOKEN"),
                GetString(env, "ANTHROPIC_API_KEY"),
                GetString(env, "OPENROUTER_API_KEY"));
            var model = FirstNonEmpty(
                GetString(env, "ANTHROPIC_MODEL"),
                GetString(env, "ANTHROPIC_DEFAULT_SONNET_MODEL"),
                "claude-sonnet-4-5-20250929");

            if (baseUrl.Length == 0 || apiKey.Length == 0)
            {
                continue;
            }

            var name = FirstNonEmpty(GetString(provider, "name"), entry.Key);
            target["cc-claude-" + Sanitize(entry.Key)] = MakeProvider(
                name,
                baseUrl,
                "anthropic-messages",
                apiKey,
                model,
                contextWindow: 200_000,
                maxTokens: 16_384,
                reasoning: true,
                image: true);
            names.Add(name);
        }
    }

    private static void ImportCodex(
        JsonObject root,
        JsonObject target,
        List<string> names)
    {
        if (root["codex"]?["providers"] is not JsonObject providers)
        {
            return;
        }

        foreach (var entry in providers)
        {
            var provider = entry.Value as JsonObject;
            var settings = provider?["settingsConfig"] as JsonObject;
            if (settings is null)
            {
                continue;
            }

            var apiKey = FirstNonEmpty(
                GetString(settings["auth"] as JsonObject, "OPENAI_API_KEY"),
                GetString(settings["env"] as JsonObject, "OPENAI_API_KEY"));
            var config = GetString(settings, "config");
            var baseUrl = Regex
                .Match(config, "base_url\\s*=\\s*\"([^\"]+)\"")
                .Groups[1]
                .Value
                .TrimEnd('/');
            var model = Regex
                .Match(config, "^\\s*model\\s*=\\s*\"([^\"]+)\"", RegexOptions.Multiline)
                .Groups[1]
                .Value;

            if (baseUrl.Length == 0 || apiKey.Length == 0)
            {
                continue;
            }

            var name = FirstNonEmpty(GetString(provider, "name"), entry.Key);
            target["cc-codex-" + Sanitize(entry.Key)] = MakeProvider(
                name,
                baseUrl,
                "openai-completions",
                apiKey,
                string.IsNullOrWhiteSpace(model) ? "gpt-5.1-codex" : model,
                contextWindow: 400_000,
                maxTokens: 128_000,
                reasoning: true,
                image: false);
            names.Add(name);
        }
    }

    private static void ImportGemini(
        JsonObject root,
        JsonObject target,
        List<string> names)
    {
        if (root["gemini"]?["providers"] is not JsonObject providers)
        {
            return;
        }

        foreach (var entry in providers)
        {
            var provider = entry.Value as JsonObject;
            var env = provider?["settingsConfig"]?["env"] as JsonObject;
            if (env is null)
            {
                continue;
            }

            var baseUrl = FirstNonEmpty(
                GetString(env, "GOOGLE_GEMINI_BASE_URL"),
                GetString(env, "GEMINI_BASE_URL"),
                "https://generativelanguage.googleapis.com/v1beta").TrimEnd('/');
            var apiKey = FirstNonEmpty(
                GetString(env, "GEMINI_API_KEY"),
                GetString(env, "GOOGLE_API_KEY"));
            if (apiKey.Length == 0)
            {
                continue;
            }

            var model = FirstNonEmpty(
                GetString(env, "GEMINI_MODEL"),
                "gemini-2.5-pro");
            var name = FirstNonEmpty(GetString(provider, "name"), entry.Key);
            target["cc-gemini-" + Sanitize(entry.Key)] = MakeProvider(
                name,
                baseUrl,
                "google-generative-ai",
                apiKey,
                model,
                contextWindow: 1_000_000,
                maxTokens: 65_536,
                reasoning: true,
                image: true);
            names.Add(name);
        }
    }

    private static JsonObject MakeProvider(
        string name,
        string baseUrl,
        string api,
        string apiKey,
        string model,
        int contextWindow,
        int maxTokens,
        bool reasoning,
        bool image)
    {
        var input = new JsonArray { "text" };
        if (image)
        {
            input.Add("image");
        }

        return new JsonObject
        {
            ["name"] = name,
            ["baseUrl"] = baseUrl,
            ["api"] = api,
            ["apiKey"] = apiKey,
            ["models"] = new JsonArray
            {
                new JsonObject
                {
                    ["id"] = model,
                    ["name"] = model,
                    ["reasoning"] = reasoning,
                    ["input"] = input,
                    ["cost"] = new JsonObject
                    {
                        ["input"] = 0,
                        ["output"] = 0,
                        ["cacheRead"] = 0,
                        ["cacheWrite"] = 0,
                    },
                    ["contextWindow"] = contextWindow,
                    ["maxTokens"] = maxTokens,
                },
            },
        };
    }

    private static string GetString(JsonObject? value, string key)
    {
        if (value?[key] is JsonValue node && node.TryGetValue<string>(out var text))
        {
            return text ?? string.Empty;
        }

        return string.Empty;
    }

    private static string FirstNonEmpty(params string?[] values)
    {
        foreach (var value in values)
        {
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value;
            }
        }

        return string.Empty;
    }

    private static string Sanitize(string value)
    {
        return Regex.Replace(value, "[^A-Za-z0-9._-]", "-");
    }
}
