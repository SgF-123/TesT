const fs = require("node:fs");
const path = require("node:path");
const paths = require("./paths.cjs");

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) {
      return fallback;
    }

    const text = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
    return text.trim() ? JSON.parse(text) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  fs.renameSync(temp, file);
}

function readModelsDocument() {
  const file = paths.modelsPath();
  const document = readJson(file, {
    $schema: "https://pi.dev/schemas/models.schema.json",
    providers: {},
  });

  if (!document || typeof document !== "object" || Array.isArray(document)) {
    return {
      $schema: "https://pi.dev/schemas/models.schema.json",
      providers: {},
    };
  }

  if (
    !document.providers ||
    typeof document.providers !== "object" ||
    Array.isArray(document.providers)
  ) {
    document.providers = {};
  }

  return document;
}

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function normalizeModel(model) {
  if (!model || typeof model !== "object") {
    return null;
  }

  const id = String(model.id ?? model.model ?? model.name ?? "").trim();
  if (!id) {
    return null;
  }

  const name = String(model.name ?? model.displayName ?? id).trim() || id;
  const normalized = { id, name };

  if (typeof model.reasoning === "boolean") {
    normalized.reasoning = model.reasoning;
  }

  if (Array.isArray(model.input)) {
    const supported = [...new Set(
      model.input.filter((item) => item === "text" || item === "image"),
    )];
    if (supported.length > 0) {
      normalized.input = supported;
    }
  }

  const contextWindow = positiveNumber(model.contextWindow);
  if (contextWindow) {
    normalized.contextWindow = contextWindow;
  }

  const maxTokens = positiveNumber(model.maxTokens);
  if (maxTokens) {
    normalized.maxTokens = maxTokens;
  }

  const cost = model.cost;
  if (
    cost &&
    typeof cost === "object" &&
    ["input", "output", "cacheRead", "cacheWrite"].every((key) =>
      Number.isFinite(Number(cost[key])),
    )
  ) {
    normalized.cost = {
      input: Number(cost.input),
      output: Number(cost.output),
      cacheRead: Number(cost.cacheRead),
      cacheWrite: Number(cost.cacheWrite),
    };
  }

  if (model.thinkingLevelMap && typeof model.thinkingLevelMap === "object") {
    normalized.thinkingLevelMap = model.thinkingLevelMap;
  }

  return normalized;
}

function normalizeModels(models) {
  if (!Array.isArray(models)) {
    return [];
  }

  const seen = new Set();
  const result = [];
  for (const model of models) {
    const normalized = normalizeModel(model);
    if (!normalized || seen.has(normalized.id)) {
      continue;
    }

    seen.add(normalized.id);
    result.push(normalized);
  }
  return result;
}

function sanitize(value) {
  return String(value || "preset").replace(/[^A-Za-z0-9._-]/g, "-");
}

function saveProvider(provider) {
  try {
    if (!provider || typeof provider !== "object") {
      return { error: "渠道信息不完整" };
    }

    const name = String(provider.name || "").trim();
    const baseUrl = String(provider.baseUrl || "").trim().replace(/\/+$/, "");
    const api = String(provider.api || "").trim();
    const apiKey = String(provider.apiKey || "").trim();
    const models = normalizeModels(provider.models);

    if (!name || !baseUrl || !api || !apiKey) {
      return { error: "渠道信息不完整" };
    }

    if (models.length === 0) {
      return {
        error:
          "预设没有可写入 Pi 的模型，请先自动拉取模型或手动填写模型 ID",
      };
    }

    const document = readModelsDocument();
    const savedKey = `pi-provider-${sanitize(provider.key || name)}`;
    const node = { name, baseUrl, api, apiKey, models };

    if (provider.headers && typeof provider.headers === "object") {
      node.headers = provider.headers;
    }
    if (provider.compat && typeof provider.compat === "object") {
      node.compat = provider.compat;
    }

    document.providers[savedKey] = node;
    writeJson(paths.modelsPath(), document);
    return { key: savedKey };
  } catch (error) {
    return { error: String(error) };
  }
}

function importPi() {
  try {
    const sourceDir = paths.nativeAgentDir();
    if (!fs.existsSync(sourceDir)) {
      return {
        providers: 0,
        auth: false,
        settings: false,
        source: sourceDir,
        error: `未找到 Pi 配置目录：${sourceDir}`,
      };
    }

    let providers = 0;
    const sourceModels = readJson(
      path.join(sourceDir, "models.json"),
      null,
    );
    if (sourceModels?.providers && typeof sourceModels.providers === "object") {
      const target = readModelsDocument();
      for (const [key, value] of Object.entries(sourceModels.providers)) {
        target.providers[key] = value;
        providers += 1;
      }
      writeJson(paths.modelsPath(), target);
    }

    let auth = false;
    const sourceAuth = readJson(path.join(sourceDir, "auth.json"), null);
    if (sourceAuth && Object.keys(sourceAuth).length > 0) {
      writeJson(paths.authPath(), sourceAuth);
      auth = true;
    }

    let settings = false;
    const sourceSettingsPath = path.join(sourceDir, "settings.json");
    const targetSettingsPath = path.join(paths.piDataDir(), "settings.json");
    if (fs.existsSync(sourceSettingsPath) && !fs.existsSync(targetSettingsPath)) {
      fs.copyFileSync(sourceSettingsPath, targetSettingsPath);
      settings = true;
    }

    if (providers === 0 && !auth && !settings) {
      return {
        providers: 0,
        auth: false,
        settings: false,
        source: sourceDir,
        error: "Pi 配置里没有可导入的渠道或登录凭证",
      };
    }

    return { providers, auth, settings, source: sourceDir, error: null };
  } catch (error) {
    return {
      providers: 0,
      auth: false,
      settings: false,
      source: paths.nativeAgentDir(),
      error: String(error),
    };
  }
}

function clearProviders() {
  try {
    const file = paths.modelsPath();
    if (fs.existsSync(file)) {
      fs.copyFileSync(file, `${file}.bak`);
      fs.unlinkSync(file);
    }

    return { error: null };
  } catch (error) {
    return { error: String(error) };
  }
}

function authStatus() {
  const status = { providers: [], oauthProviders: [] };
  const auth = readJson(paths.authPath(), {});
  if (!auth || typeof auth !== "object" || Array.isArray(auth)) {
    return status;
  }

  for (const [provider, credential] of Object.entries(auth)) {
    status.providers.push(provider);
    if (
      credential &&
      typeof credential === "object" &&
      credential.type === "oauth"
    ) {
      status.oauthProviders.push(provider);
    }
  }

  status.providers.sort((a, b) => a.localeCompare(b));
  status.oauthProviders.sort((a, b) => a.localeCompare(b));
  return status;
}

module.exports = {
  authStatus,
  clearProviders,
  importPi,
  normalizeModels,
  readModelsDocument,
  saveProvider,
};
