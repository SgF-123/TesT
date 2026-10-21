const fs = require("node:fs");
const path = require("node:path");
const electron = require("electron");
const paths = require("../paths.cjs");
const { validateFeishuConfig, redactFeishuConfig } = require("./feishu.cjs");

const safeStorage = electron?.safeStorage;

const DEFAULTS = Object.freeze({
  appId: "",
  appSecret: "",
  enabled: false,
  longConnection: true,
  autoPair: true,
  receiveIdType: "chat_id",
  receiveId: "",
  allowedOpenIds: [],
  allowAll: false,
});

function configPath() {
  return path.join(paths.dataDir(), "feishu.json");
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeConfig(input = {}) {
  const receiveIdType = ["chat_id", "open_id", "user_id", "email"].includes(
    input.receiveIdType,
  )
    ? input.receiveIdType
    : DEFAULTS.receiveIdType;
  const allowedOpenIds = Array.isArray(input.allowedOpenIds)
    ? [...new Set(input.allowedOpenIds.map(stringValue).filter(Boolean))]
    : [];

  return {
    appId: stringValue(input.appId),
    appSecret: typeof input.appSecret === "string" ? input.appSecret : "",
    enabled: Boolean(input.enabled),
    longConnection: input.longConnection !== false,
    autoPair: input.autoPair !== false,
    receiveIdType,
    receiveId: stringValue(input.receiveId),
    allowedOpenIds,
    allowAll: Boolean(input.allowAll),
  };
}

function readConfig() {
  try {
    const raw = JSON.parse(fs.readFileSync(configPath(), "utf8"));
    return normalizeConfig({
      ...DEFAULTS,
      ...raw,
      appSecret: decryptSecret(raw),
    });
  } catch {
    return { ...DEFAULTS, allowedOpenIds: [] };
  }
}

function writeConfig(config) {
  const stored = {
    appId: config.appId,
    enabled: config.enabled,
    longConnection: config.longConnection,
    autoPair: config.autoPair,
    receiveIdType: config.receiveIdType,
    receiveId: config.receiveId,
    allowedOpenIds: config.allowedOpenIds,
    allowAll: config.allowAll,
  };
  const secret = encryptSecret(config.appSecret);
  if (secret.appSecretEncrypted) {
    stored.appSecretEncrypted = secret.appSecretEncrypted;
  } else if (secret.appSecret) {
    stored.appSecret = secret.appSecret;
  }

  fs.writeFileSync(configPath(), `${JSON.stringify(stored, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
}

function encryptSecret(secret) {
  if (!secret) {
    return { appSecret: "", appSecretEncrypted: "" };
  }
  try {
    if (safeStorage?.isEncryptionAvailable?.()) {
      return {
        appSecret: "",
        appSecretEncrypted: safeStorage
          .encryptString(secret)
          .toString("base64"),
      };
    }
  } catch {
    // Fall back to the user data file if DPAPI is unavailable.
  }
  return { appSecret: secret, appSecretEncrypted: "" };
}

function decryptSecret(raw) {
  if (typeof raw?.appSecretEncrypted === "string" && raw.appSecretEncrypted) {
    try {
      return safeStorage.decryptString(
        Buffer.from(raw.appSecretEncrypted, "base64"),
      );
    } catch {
      return "";
    }
  }
  return typeof raw?.appSecret === "string" ? raw.appSecret : "";
}

function readForRenderer() {
  const config = readConfig();
  return {
    config: { ...redactFeishuConfig(config), appSecret: "" },
    hasSecret: Boolean(config.appSecret),
    validation: validateFeishuConfig(config),
    path: configPath(),
    enabled: config.enabled,
  };
}

function saveConfig(input = {}) {
  const current = readConfig();
  const next = normalizeConfig({
    ...current,
    ...input,
    appSecret:
      typeof input.appSecret === "string" && input.appSecret
        ? input.appSecret
        : input.clearSecret
          ? ""
          : current.appSecret,
  });
  writeConfig(next);
  return readForRenderer();
}

async function verifyCredentials(input = {}) {
  const current = readConfig();
  const appId = stringValue(input.appId) || current.appId;
  const appSecret =
    typeof input.appSecret === "string" && input.appSecret
      ? input.appSecret
      : current.appSecret;
  if (!appId || !appSecret) {
    return { ok: false, error: "App ID 和 App Secret 必填" };
  }
  try {
    const response = await fetch(
      "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_id: appId,
          app_secret: appSecret,
        }),
      },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.code !== 0) {
      return {
        ok: false,
        error:
          data?.msg ||
          data?.error?.message ||
          `飞书返回 HTTP ${response.status}`,
      };
    }
    return { ok: true, appId };
  } catch (error) {
    return {
      ok: false,
      error: `连接飞书失败：${String(error?.message || error)}`,
    };
  }
}

module.exports = {
  configPath,
  readConfig,
  readForRenderer,
  saveConfig,
  verifyCredentials,
};
