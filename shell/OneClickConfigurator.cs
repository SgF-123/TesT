using System.Text.Json.Nodes;

namespace TesT.Shell;

internal static class OneClickConfigurator
{
    public sealed record Result(
        int Providers,
        bool Auth,
        string Source,
        IReadOnlyList<string> Names,
        string? Error);

    public static Result Configure(
        string piNativeDir,
        string piDataDir,
        string? ccConfigPath)
    {
        var names = new List<string>();

        var pi = PiConfigImporter.Import(piNativeDir, piDataDir);
        if (pi.Error is null && (pi.Providers > 0 || pi.Auth))
        {
            return new Result(
                pi.Providers,
                pi.Auth,
                "Pi 原生配置",
                names,
                null);
        }

        if (ccConfigPath is not null)
        {
            var cc = CcImporter.Import(
                ccConfigPath,
                Path.Combine(piDataDir, "models.json"));
            if (cc.Error is null && cc.Imported > 0)
            {
                return new Result(
                    cc.Imported,
                    false,
                    "CC Switch 数据",
                    cc.Names,
                    null);
            }
        }

        var envProviders = EnvironmentProviders();
        foreach (var item in envProviders)
        {
            var apiKey = Environment.GetEnvironmentVariable(item.Env);
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                continue;
            }

            var saved = CcImporter.SaveProvider(
                Path.Combine(piDataDir, "models.json"),
                BuildProvider(item, apiKey));
            if (saved.Error is null)
            {
                names.Add(item.Name);
            }
        }

        if (names.Count > 0)
        {
            return new Result(names.Count, false, "环境变量", names, null);
        }

        return new Result(
            0,
            false,
            string.Empty,
            Array.Empty<string>(),
            "没有检测到可用配置。请用模型预设、从 Pi 导入，或先设置对应的 API Key 环境变量。");
    }

    private static JsonObject BuildProvider(EnvProvider item, string apiKey)
    {
        var input = new JsonArray { "text" };
        if (item.Image)
        {
            input.Add("image");
        }

        return new JsonObject
        {
            ["key"] = "oneclick-" + item.Key,
            ["name"] = item.Name,
            ["baseUrl"] = item.BaseUrl,
            ["api"] = item.Api,
            ["apiKey"] = apiKey,
            ["models"] = new JsonArray
            {
                new JsonObject
                {
                    ["id"] = item.Model,
                    ["name"] = item.Model,
                    ["reasoning"] = true,
                    ["input"] = input,
                    ["cost"] = new JsonObject
                    {
                        ["input"] = 0,
                        ["output"] = 0,
                        ["cacheRead"] = 0,
                        ["cacheWrite"] = 0,
                    },
                    ["contextWindow"] = item.ContextWindow,
                    ["maxTokens"] = item.MaxTokens,
                },
            },
        };
    }

    private static IReadOnlyList<EnvProvider> EnvironmentProviders()
    {
        return new[]
        {
            new EnvProvider(
                "ANTHROPIC_API_KEY",
                "anthropic",
                "Anthropic",
                "https://api.anthropic.com",
                "anthropic-messages",
                "claude-sonnet-4-5-20250929",
                200_000,
                16_384,
                true),
            new EnvProvider(
                "OPENAI_API_KEY",
                "openai",
                "OpenAI",
                "https://api.openai.com/v1",
                "openai-completions",
                "gpt-5.1-codex",
                400_000,
                128_000,
                true),
            new EnvProvider(
                "GEMINI_API_KEY",
                "gemini",
                "Gemini",
                "https://generativelanguage.googleapis.com/v1beta",
                "google-generative-ai",
                "gemini-2.5-pro",
                1_000_000,
                65_536,
                true),
            new EnvProvider(
                "GOOGLE_API_KEY",
                "google",
                "Google Gemini",
                "https://generativelanguage.googleapis.com/v1beta",
                "google-generative-ai",
                "gemini-2.5-pro",
                1_000_000,
                65_536,
                true),
            new EnvProvider(
                "DEEPSEEK_API_KEY",
                "deepseek",
                "DeepSeek",
                "https://api.deepseek.com/v1",
                "openai-completions",
                "deepseek-v4-pro",
                1_000_000,
                128_000,
                false),
            new EnvProvider(
                "OPENROUTER_API_KEY",
                "openrouter",
                "OpenRouter",
                "https://openrouter.ai/api",
                "anthropic-messages",
                "anthropic/claude-sonnet-5",
                200_000,
                64_000,
                true),
            new EnvProvider(
                "MOONSHOT_API_KEY",
                "kimi",
                "Kimi",
                "https://api.moonshot.cn/v1",
                "openai-completions",
                "kimi-k2.7-code",
                256_000,
                32_000,
                false),
            new EnvProvider(
                "ZHIPU_API_KEY",
                "zhipu",
                "Zhipu GLM",
                "https://open.bigmodel.cn/api/coding/paas/v4",
                "openai-completions",
                "glm-5.3",
                200_000,
                32_000,
                false),
            new EnvProvider(
                "DASHSCOPE_API_KEY",
                "qwen",
                "Qwen",
                "https://dashscope.aliyuncs.com/compatible-mode/v1",
                "openai-completions",
                "qwen3.8-max",
                1_000_000,
                64_000,
                false),
        };
    }

    private sealed record EnvProvider(
        string Env,
        string Key,
        string Name,
        string BaseUrl,
        string Api,
        string Model,
        int ContextWindow,
        int MaxTokens,
        bool Image);
}
