const crypto = require("node:crypto");

const COMMAND_TYPES = new Set([
  "prompt",
  "steer",
  "follow_up",
  "abort",
  "new_session",
  "switch_session",
  "set_model",
  "set_thinking_level",
  "compact",
  "get_state",
  "get_messages",
  "get_available_models",
  "get_session_stats",
]);

const MESSAGE_KINDS = new Set([
  "text",
  "markdown",
  "card",
  "file",
  "image",
  "voice",
  "status",
]);

const CHANNEL_STATES = new Set([
  "not_configured",
  "stopped",
  "starting",
  "online",
  "reconnecting",
  "error",
  "not_implemented",
]);

const DEFAULT_CAPABILITIES = Object.freeze({
  text: true,
  markdown: false,
  cards: false,
  buttons: false,
  files: false,
  images: false,
  voice: false,
  threads: false,
  typing: false,
  push: false,
  editMessage: false,
});

function newId(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
}

/**
 * Normalize a channel-originated command into the internal Pi command shape.
 * Channel adapters must call this before handing a command to the agent.
 *
 * @param {object} input
 * @param {string} [source]
 * @returns {object}
 */
function normalizeCommand(input, source = "unknown") {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("channel command must be an object");
  }
  if (!COMMAND_TYPES.has(input.type)) {
    throw new Error(`unsupported channel command: ${String(input.type)}`);
  }

  const command = {
    ...input,
    id:
      typeof input.id === "string" && input.id
        ? input.id
        : newId("channel"),
    source,
  };

  if (command.type === "prompt" || command.type === "steer" || command.type === "follow_up") {
    if (typeof command.message !== "string" || !command.message.trim()) {
      throw new Error(`${command.type} requires a non-empty message`);
    }
    command.message = command.message.trim();
  }

  if (command.type === "switch_session") {
    if (typeof command.sessionPath !== "string" || !command.sessionPath) {
      throw new Error("switch_session requires sessionPath");
    }
  }

  if (command.type === "set_model") {
    if (!command.provider || !command.modelId) {
      throw new Error("set_model requires provider and modelId");
    }
  }

  return command;
}

/**
 * Normalize an outbound message. Feishu cards, files, etc. can use the same
 * envelope while keeping channel-specific payloads in `meta`.
 *
 * @param {object} input
 * @param {string} [source]
 * @returns {object}
 */
function normalizeMessage(input, source = "unknown") {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("channel message must be an object");
  }
  if (!MESSAGE_KINDS.has(input.kind)) {
    throw new Error(`unsupported channel message kind: ${String(input.kind)}`);
  }
  if (typeof input.text !== "string") {
    throw new TypeError("channel message text must be a string");
  }
  return {
    ...input,
    id:
      typeof input.id === "string" && input.id
        ? input.id
        : newId("msg"),
    source,
  };
}

function notImplemented(feature) {
  const error = new Error(`${feature} 尚未实现（当前只定义接口）`);
  error.code = "CHANNEL_NOT_IMPLEMENTED";
  return error;
}

/**
 * @param {{
 *   id: string,
 *   label: string,
 *   capabilities?: object,
 *   start: Function,
 *   stop: Function,
 *   status: Function,
 *   onCommand: Function,
 *   send: Function,
 *   update: Function
 * }} spec
 */
function defineChannel(spec) {
  for (const key of [
    "id",
    "label",
    "start",
    "stop",
    "status",
    "onCommand",
    "send",
    "update",
  ]) {
    if (!spec || spec[key] === undefined) {
      throw new Error(`channel is missing ${key}`);
    }
  }

  const channel = {
    ...spec,
    capabilities: {
      ...DEFAULT_CAPABILITIES,
      ...(spec.capabilities || {}),
    },
  };

  return Object.freeze(channel);
}

function createRegistry() {
  const channels = new Map();

  return {
    register(channel) {
      if (!channel || typeof channel.id !== "string" || !channel.id) {
        throw new Error("channel id is required");
      }
      channels.set(channel.id, channel);
      return channel;
    },

    get(id) {
      return channels.get(id) || null;
    },

    list() {
      return [...channels.values()];
    },

    statuses() {
      return [...channels.values()].map((channel) => channel.status());
    },
  };
}

module.exports = {
  CHANNEL_STATES,
  COMMAND_TYPES,
  DEFAULT_CAPABILITIES,
  MESSAGE_KINDS,
  createRegistry,
  defineChannel,
  normalizeCommand,
  normalizeMessage,
  notImplemented,
};
