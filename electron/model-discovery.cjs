function endpointCandidates(baseUrl, api) {
  const root = String(baseUrl || "").trim().replace(/\/+$/, "");
  const result = [];
  const add = (value) => {
    if (value && !result.includes(value)) {
      result.push(value);
    }
  };

  if (!root) {
    return result;
  }

  if (api === "google-generative-ai") {
    if (/\/v1(?:beta)?$/i.test(root)) {
      add(`${root}/models`);
    } else {
      add(`${root}/v1beta/models`);
      add(`${root}/models`);
    }
    return result;
  }

  if (api === "anthropic-messages") {
    add(`${root}/v1/models`);
    add(`${root}/models`);
    return result;
  }

  add(`${root}/models`);
  if (!/\/v1$/i.test(root)) {
    add(`${root}/v1/models`);
  }
  return result;
}

function buildHeaders(api, apiKey, apiKeyField, configured) {
  const headers = { Accept: "application/json" };
  if (configured && typeof configured === "object") {
    for (const [key, value] of Object.entries(configured)) {
      if (
        typeof value === "string" &&
        value &&
        !value.includes("${")
      ) {
        headers[key] = value;
      }
    }
  }

  if (!apiKey) {
    return headers;
  }

  if (api === "anthropic-messages") {
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
    if (apiKeyField !== "ANTHROPIC_API_KEY") {
      headers.Authorization = `Bearer ${apiKey}`;
    }
  } else if (api === "google-generative-ai") {
    headers["x-goog-api-key"] = apiKey;
  } else {
    headers.Authorization = `Bearer ${apiKey}`;
    headers["x-api-key"] = apiKey;
  }

  return headers;
}

function addKeyQuery(endpoint, api, apiKey) {
  if (api !== "google-generative-ai" || !apiKey) {
    return endpoint;
  }

  const url = new URL(endpoint);
  if (!url.searchParams.has("key")) {
    url.searchParams.set("key", apiKey);
  }
  return url.toString();
}

function modelFromValue(value) {
  if (typeof value === "string") {
    const id = value.trim();
    return id ? { id, name: id } : null;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  let id = String(
    value.id ?? value.model ?? value.name ?? "",
  ).trim();
  if (!id) {
    return null;
  }

  if (id.startsWith("models/")) {
    id = id.slice("models/".length);
  }

  const name = String(
    value.display_name ??
      value.displayName ??
      value.name ??
      id,
  ).trim();
  return { id, name: name || id };
}

function parseModels(payload) {
  let items = [];
  if (Array.isArray(payload)) {
    items = payload;
  } else if (payload && typeof payload === "object") {
    for (const key of ["data", "models", "results", "items"]) {
      if (Array.isArray(payload[key])) {
        items = payload[key];
        break;
      }
      if (payload[key] && typeof payload[key] === "object") {
        items = Object.values(payload[key]);
        break;
      }
    }
  }

  const seen = new Set();
  const models = [];
  for (const item of items) {
    const model = modelFromValue(item);
    if (!model || seen.has(model.id)) {
      continue;
    }

    seen.add(model.id);
    models.push(model);
  }

  return models.sort((a, b) => a.id.localeCompare(b.id));
}

async function fetchModels({
  baseUrl,
  api,
  apiKey,
  apiKeyField,
  headers,
}) {
  const candidates = endpointCandidates(baseUrl, api);
  if (candidates.length === 0) {
    return { models: [], endpoint: null, error: "缺少 Base URL" };
  }

  const errors = [];
  for (const candidate of candidates) {
    const endpoint = addKeyQuery(candidate, api, apiKey);
    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: buildHeaders(api, apiKey, apiKeyField, headers),
        signal: AbortSignal.timeout(18_000),
      });
      const text = await response.text();
      if (!response.ok) {
        errors.push(`${response.status} ${response.statusText} · ${endpoint}`);
        continue;
      }

      let payload;
      try {
        payload = JSON.parse(text);
      } catch {
        errors.push(`返回不是 JSON · ${endpoint}`);
        continue;
      }

      const models = parseModels(payload);
      if (models.length > 0) {
        return { models, endpoint, error: null };
      }

      errors.push(`返回中没有模型 · ${endpoint}`);
    } catch (error) {
      errors.push(`${error?.message || error} · ${endpoint}`);
    }
  }

  return {
    models: [],
    endpoint: null,
    error: `自动拉取失败：\n${errors.slice(0, 4).join("\n")}`,
  };
}

module.exports = { fetchModels, parseModels };
