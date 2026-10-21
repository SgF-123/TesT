using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json.Nodes;

namespace TesT.Shell;

internal static class ModelDiscovery
{
    public sealed record ModelItem(string Id, string Name);

    public sealed record Result(
        IReadOnlyList<ModelItem> Models,
        string? Error,
        string? Endpoint);

    private static readonly HttpClient Http = CreateClient();

    private static HttpClient CreateClient()
    {
        var client = new HttpClient
        {
            Timeout = TimeSpan.FromSeconds(18),
        };
        client.DefaultRequestHeaders.UserAgent.ParseAdd(
            "TesT-Desktop/0.1 (+pi-agent)");
        return client;
    }

    public static async Task<Result> FetchAsync(
        string baseUrl,
        string api,
        string apiKey,
        string? apiKeyField,
        JsonObject? headers)
    {
        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            return new Result(Array.Empty<ModelItem>(), "缺少 Base URL", null);
        }

        var root = baseUrl.Trim().TrimEnd('/');
        var candidates = EndpointCandidates(root, api);
        var errors = new List<string>();

        foreach (var endpoint in candidates)
        {
            try
            {
                using var request = new HttpRequestMessage(
                    HttpMethod.Get,
                    BuildUri(endpoint, api, apiKey));
                ApplyAuth(request, api, apiKey, apiKeyField);
                ApplyHeaders(request, headers);

                using var response = await Http.SendAsync(
                    request,
                    HttpCompletionOption.ResponseHeadersRead);
                var text = await response.Content.ReadAsStringAsync();
                if (!response.IsSuccessStatusCode)
                {
                    errors.Add(
                        $"{(int)response.StatusCode} {response.ReasonPhrase} · {endpoint}");
                    continue;
                }

                var models = Parse(text);
                if (models.Count > 0)
                {
                    return new Result(models, null, endpoint);
                }

                errors.Add($"返回中没有模型 · {endpoint}");
            }
            catch (Exception ex)
            {
                errors.Add($"{ex.Message} · {endpoint}");
            }
        }

        var detail = errors.Count > 0
            ? string.Join("\n", errors.Take(4))
            : "没有可用的模型列表接口";
        return new Result(
            Array.Empty<ModelItem>(),
            $"自动拉取失败：{detail}",
            null);
    }

    private static IReadOnlyList<string> EndpointCandidates(
        string root,
        string api)
    {
        var candidates = new List<string>();
        void Add(string value)
        {
            if (!candidates.Contains(value, StringComparer.OrdinalIgnoreCase))
            {
                candidates.Add(value);
            }
        }

        if (string.Equals(api, "google-generative-ai", StringComparison.OrdinalIgnoreCase))
        {
            if (root.Contains("/v1beta", StringComparison.OrdinalIgnoreCase) ||
                root.Contains("/v1", StringComparison.OrdinalIgnoreCase))
            {
                Add(root + "/models");
            }
            else
            {
                Add(root + "/v1beta/models");
                Add(root + "/models");
            }
            return candidates;
        }

        if (string.Equals(api, "anthropic-messages", StringComparison.OrdinalIgnoreCase))
        {
            Add(root + "/v1/models");
            Add(root + "/models");
            return candidates;
        }

        Add(root + "/models");
        if (!root.EndsWith("/v1", StringComparison.OrdinalIgnoreCase))
        {
            Add(root + "/v1/models");
        }
        return candidates;
    }

    private static string BuildUri(string endpoint, string api, string apiKey)
    {
        if (!string.Equals(api, "google-generative-ai", StringComparison.OrdinalIgnoreCase))
        {
            return endpoint;
        }

        if (endpoint.Contains("key=", StringComparison.OrdinalIgnoreCase))
        {
            return endpoint;
        }

        var separator = endpoint.Contains('?') ? "&" : "?";
        return endpoint + separator + "key=" + Uri.EscapeDataString(apiKey);
    }

    private static void ApplyAuth(
        HttpRequestMessage request,
        string api,
        string apiKey,
        string? apiKeyField)
    {
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            return;
        }

        if (string.Equals(api, "anthropic-messages", StringComparison.OrdinalIgnoreCase))
        {
            if (string.Equals(apiKeyField, "ANTHROPIC_API_KEY", StringComparison.OrdinalIgnoreCase))
            {
                request.Headers.TryAddWithoutValidation("x-api-key", apiKey);
            }
            else
            {
                request.Headers.Authorization =
                    new AuthenticationHeaderValue("Bearer", apiKey);
                request.Headers.TryAddWithoutValidation("x-api-key", apiKey);
            }

            request.Headers.TryAddWithoutValidation(
                "anthropic-version",
                "2023-06-01");
            return;
        }

        request.Headers.Authorization =
            new AuthenticationHeaderValue("Bearer", apiKey);
        request.Headers.TryAddWithoutValidation("x-api-key", apiKey);
    }

    private static void ApplyHeaders(
        HttpRequestMessage request,
        JsonObject? headers)
    {
        if (headers is null)
        {
            return;
        }

        foreach (var entry in headers)
        {
            if (entry.Value is not JsonValue value ||
                !value.TryGetValue<string>(out var text) ||
                string.IsNullOrWhiteSpace(text) ||
                text.Contains("${", StringComparison.Ordinal))
            {
                continue;
            }

            request.Headers.TryAddWithoutValidation(entry.Key, text);
        }
    }

    private static IReadOnlyList<ModelItem> Parse(string text)
    {
        JsonNode? node;
        try
        {
            node = JsonNode.Parse(text);
        }
        catch
        {
            return Array.Empty<ModelItem>();
        }

        var results = new List<ModelItem>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        void Add(string? id, string? name)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return;
            }

            var clean = id.Trim();
            if (clean.StartsWith("models/", StringComparison.OrdinalIgnoreCase))
            {
                clean = clean["models/".Length..];
            }

            if (!seen.Add(clean))
            {
                return;
            }

            results.Add(
                new ModelItem(
                    clean,
                    string.IsNullOrWhiteSpace(name) ? clean : name.Trim()));
        }

        if (node is JsonArray array)
        {
            foreach (var item in array)
            {
                if (item is JsonValue value &&
                    value.TryGetValue<string>(out var id))
                {
                    Add(id, id);
                }
                else if (item is JsonObject obj)
                {
                    Add(
                        GetString(obj, "id") is { Length: > 0 } id2
                            ? id2
                            : GetString(obj, "name"),
                        GetString(obj, "display_name") is { Length: > 0 } display
                            ? display
                            : GetString(obj, "displayName") is { Length: > 0 } displayName
                                ? displayName
                                : GetString(obj, "name"));
                }
            }
        }
        else if (node is JsonObject root)
        {
            if (root["data"] is JsonArray data)
            {
                foreach (var item in data)
                {
                    if (item is not JsonObject obj)
                    {
                        continue;
                    }

                    Add(
                        GetString(obj, "id"),
                        GetString(obj, "display_name") is { Length: > 0 } display
                            ? display
                            : GetString(obj, "displayName") is { Length: > 0 } displayName
                                ? displayName
                                : GetString(obj, "name"));
                }
            }

            if (root["models"] is JsonArray models)
            {
                foreach (var item in models)
                {
                    if (item is not JsonObject obj)
                    {
                        continue;
                    }

                    Add(
                        GetString(obj, "id") is { Length: > 0 } id
                            ? id
                            : GetString(obj, "name"),
                        GetString(obj, "displayName") is { Length: > 0 } display
                            ? display
                            : GetString(obj, "display_name") is { Length: > 0 } displayName
                                ? displayName
                                : GetString(obj, "name"));
                }
            }
        }

        return results
            .OrderBy(
                model => model.Id,
                StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    private static string GetString(JsonObject value, string key)
    {
        if (value[key] is JsonValue node &&
            node.TryGetValue<string>(out var text))
        {
            return text ?? string.Empty;
        }

        return string.Empty;
    }
}
