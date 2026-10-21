const {
  defineChannel,
  normalizeCommand,
  normalizeMessage,
  notImplemented,
} = require("./contract.cjs");

const FEISHU_CONFIG_SCHEMA = Object.freeze({
  appId: { type: "string", required: true, secret: false },
  appSecret: { type: "string", required: true, secret: true },
  enabled: { type: "boolean", default: false },
  longConnection: { type: "boolean", default: true },
  receiveIdType: {
    type: "string",
    enum: ["chat_id", "open_id", "user_id", "email"],
    default: "chat_id",
  },
  autoPair: { type: "boolean", default: true },
  receiveId: { type: "string", required: false },
  allowedOpenIds: { type: "array", item: "string", default: [] },
  allowAll: { type: "boolean", default: false },
});

function validateFeishuConfig(config = {}) {
  const errors = [];
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return { ok: false, errors: ["配置必须是对象"] };
  }
  if (typeof config.appId !== "string" || !config.appId.trim()) {
    errors.push("appId 必填");
  }
  if (typeof config.appSecret !== "string" || !config.appSecret.trim()) {
    errors.push("appSecret 必填");
  }
  if (
    config.receiveIdType !== undefined &&
    !["chat_id", "open_id", "user_id", "email"].includes(config.receiveIdType)
  ) {
    errors.push("receiveIdType 不支持");
  }
  if (
    config.allowedOpenIds !== undefined &&
    (!Array.isArray(config.allowedOpenIds) ||
      config.allowedOpenIds.some((item) => typeof item !== "string"))
  ) {
    errors.push("allowedOpenIds 必须是字符串数组");
  }
  if (
    config.autoPair === false &&
    !config.allowAll &&
    !(config.allowedOpenIds || []).length
  ) {
    errors.push("关闭自动配对时，必须配置 allowedOpenIds 或 allowAll");
  }
  if (
    config.autoPair === false &&
    (typeof config.receiveId !== "string" || !config.receiveId.trim())
  ) {
    errors.push("关闭自动配对时，receiveId 必填");
  }
  return { ok: errors.length === 0, errors };
}

function redactFeishuConfig(config = {}) {
  return {
    ...config,
    appSecret: config.appSecret ? "***" : "",
  };
}

/**
 * Feishu adapter contract.
 *
 * Intentionally does NOT import the Feishu SDK, open a WebSocket, or handle
 * events yet. It only exposes the shape that the real adapter must implement.
 */
function createFeishuChannel() {
  let handler = () => {};
  let state = {
    id: "feishu",
    label: "飞书",
    state: "not_configured",
    configured: false,
    message: "尚未配置飞书应用",
    lastError: "",
    since: null,
  };

  function snapshot() {
    return {
      ...state,
      capabilities: {
        text: true,
        markdown: true,
        cards: true,
        buttons: true,
        files: true,
        images: true,
        voice: false,
        threads: false,
        typing: false,
        push: true,
        editMessage: true,
      },
    };
  }

  return defineChannel({
    id: "feishu",
    label: "飞书",
    configSchema: FEISHU_CONFIG_SCHEMA,
    validateConfig: validateFeishuConfig,
    redactConfig: redactFeishuConfig,
    capabilities: {
      text: true,
      markdown: true,
      cards: true,
      buttons: true,
      files: true,
      images: true,
      voice: false,
      threads: false,
      typing: false,
      push: true,
      editMessage: true,
    },

    status() {
      return snapshot();
    },

    async start(config = {}) {
      const result = validateFeishuConfig(config);
      if (!result.ok) {
        state = {
          ...state,
          configured: false,
          state: "error",
          message: "飞书配置不完整",
          lastError: result.errors.join("；"),
          since: Date.now(),
        };
        return snapshot();
      }

      state = {
        ...state,
        configured: true,
        state: "not_implemented",
        message: "飞书接口已定义，接入处理尚未实现",
        lastError: "",
        since: Date.now(),
      };
      return snapshot();
    },

    async stop() {
      state = {
        ...state,
        state: "stopped",
        message: "已停止",
        lastError: "",
        since: Date.now(),
      };
      return snapshot();
    },

    onCommand(listener) {
      handler = typeof listener === "function" ? listener : () => {};
      return () => {
        if (handler === listener) {
          handler = () => {};
        }
      };
    },

    async send(message) {
      normalizeMessage(message, "feishu");
      throw notImplemented("feishu.send");
    },

    async update(messageId, message) {
      if (typeof messageId !== "string" || !messageId) {
        throw new Error("update requires messageId");
      }
      normalizeMessage(message, "feishu");
      throw notImplemented("feishu.update");
    },

    /**
     * The real adapter will call this after normalizing a Feishu event.
     * Keeping it on the contract makes the future event mapping explicit.
     */
    _dispatch(command) {
      const normalized = normalizeCommand(command, "feishu");
      handler(normalized);
      return normalized;
    },
  });
}

module.exports = {
  FEISHU_CONFIG_SCHEMA,
  createFeishuChannel,
  redactFeishuConfig,
  validateFeishuConfig,
};
