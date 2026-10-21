const lark = require("@larksuiteoapi/node-sdk");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const CAPABILITIES = Object.freeze({
  text: true,
  markdown: false,
  cards: false,
  buttons: false,
  approvals: true,
  files: false,
  images: false,
  voice: false,
  threads: false,
  typing: false,
  push: true,
  editMessage: false,
});

const APPROVAL_TTL_MS = 15 * 60 * 1000;

function isApprovalRequest(record) {
  const method = String(record?.method || "");
  if (method === "confirm") {
    return true;
  }
  if (method !== "select") {
    return false;
  }
  const options = Array.isArray(record.options)
    ? record.options.map((option) => String(option))
    : [];
  const text = `${record.title || ""} ${record.message || ""}`;
  return (
    options.some((option) =>
      /(允许|批准|同意|确认|继续|allow|approve|yes|continue)/i.test(option),
    ) ||
    /(审批|批准|允许|危险|确认|permission|approve|danger)/i.test(text)
  );
}

function approvalOption(options, approved) {
  const list = Array.isArray(options) ? options.map(String) : [];
  if (list.length === 0) {
    return approved ? "确认" : "取消";
  }
  const pattern = approved
    ? /(允许|批准|同意|确认|继续|allow|approve|yes|continue)/i
    : /(阻止|拒绝|取消|deny|block|no|cancel)/i;
  return (
    list.find((option) => pattern.test(option)) ||
    (approved ? list[0] : list[list.length - 1])
  );
}

function extractText(message) {
  if (!message) {
    return "";
  }
  if (typeof message.content === "string") {
    return message.content;
  }
  if (Array.isArray(message.content)) {
    return message.content
      .filter((block) => block?.type === "text")
      .map((block) => block.text || "")
      .join("");
  }
  return typeof message.text === "string" ? message.text : "";
}

function sanitizeName(value) {
  const name = String(value || "feishu-file")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return name || "feishu-file";
}

function labelForType(type) {
  if (type === "audio") {
    return "语音";
  }
  if (type === "video" || type === "media") {
    return "视频";
  }
  return "文件";
}

function imageMime(buffer) {
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return "image/png";
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    return "image/jpeg";
  }
  if (buffer.subarray(0, 3).toString("ascii") === "GIF") {
    return "image/gif";
  }
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return "image/png";
}

class FeishuAgent {
  constructor({ sendCommand, log, onPair }) {
    this.sendCommand = sendCommand;
    this.log = typeof log === "function" ? log : () => {};
    this.onPair = typeof onPair === "function" ? onPair : () => {};
    this.client = null;
    this.wsClient = null;
    this.config = null;
    this.pending = [];
    this.approvals = new Map();
    this.busy = false;
    this.seen = new Set();
    this.state = {
      id: "feishu",
      label: "飞书",
      state: "stopped",
      configured: false,
      message: "未启动",
      lastError: "",
      since: null,
    };
  }

  status() {
    return {
      ...this.state,
      capabilities: CAPABILITIES,
    };
  }

  setState(patch) {
    this.state = {
      ...this.state,
      ...patch,
      since: Date.now(),
    };
    this.log(`feishu:${this.state.state} ${this.state.message || ""}`);
  }

  async start(config) {
    await this.stop();
    this.config = config || {};
    if (!this.config.enabled) {
      this.setState({
        state: "stopped",
        configured: Boolean(this.config.appId && this.config.appSecret),
        message: "飞书未启用",
        lastError: "",
      });
      return this.status();
    }
    if (!this.config.appId || !this.config.appSecret) {
      this.setState({
        state: "error",
        configured: false,
        message: "飞书配置不完整",
        lastError: "appId / appSecret 必填",
      });
      return this.status();
    }
    if (!this.config.longConnection) {
      this.setState({
        state: "error",
        configured: true,
        message: "当前仅支持长连接模式",
        lastError: "请打开 longConnection",
      });
      return this.status();
    }

    this.setState({
      state: "starting",
      configured: true,
      message: "正在连接飞书…",
      lastError: "",
    });
    try {
      this.client = new lark.Client({
        appId: this.config.appId,
        appSecret: this.config.appSecret,
        appType: lark.AppType.SelfBuild,
      });
      this.wsClient = new lark.WSClient({
        appId: this.config.appId,
        appSecret: this.config.appSecret,
        loggerLevel: lark.LoggerLevel.warn,
        onReady: () => {
          this.setState({
            state: "online",
            configured: true,
            message: this.config.autoPair
              ? "飞书在线，等待首次配对"
              : "飞书长连接已建立",
            lastError: "",
          });
        },
        onReconnecting: () => {
          this.setState({
            state: "reconnecting",
            message: "飞书连接断开，正在重连…",
          });
        },
        onError: (error) => {
          this.setState({
            state: "error",
            message: "飞书连接失败",
            lastError: String(error?.message || error),
          });
        },
      });
      const dispatcher = new lark.EventDispatcher({}).register({
        "im.message.receive_v1": (data) => this.handleEvent(data),
      });
      this.wsClient
        .start({ eventDispatcher: dispatcher })
        .catch((error) => {
          this.setState({
            state: "error",
            message: "飞书启动失败",
            lastError: String(error?.message || error),
          });
        });
    } catch (error) {
      this.setState({
        state: "error",
        message: "飞书初始化失败",
        lastError: String(error?.message || error),
      });
    }
    return this.status();
  }

  async stop() {
    this.pending = [];
    this.approvals.clear();
    this.busy = false;
    try {
      this.wsClient?.close({ force: true });
    } catch {
      // ignore
    }
    this.wsClient = null;
    this.client = null;
    if (this.state.state !== "stopped") {
      this.setState({
        state: "stopped",
        message: "飞书已停止",
        lastError: "",
      });
    }
    return this.status();
  }

  allowed(openId) {
    if (this.config?.allowAll) {
      return true;
    }
    return Boolean(
      openId && (this.config?.allowedOpenIds || []).includes(openId),
    );
  }

  canAutoPair(openId, chatId) {
    return Boolean(
      this.config?.autoPair !== false &&
        openId &&
        chatId &&
        !(this.config?.allowedOpenIds || []).length,
    );
  }

  async bindPair(openId, chatId) {
    this.config.allowedOpenIds = [openId];
    this.config.receiveId = chatId;
    this.config.receiveIdType = "chat_id";
    this.config.autoPair = false;
    try {
      await Promise.resolve(
        this.onPair({
          allowedOpenIds: [openId],
          receiveId: chatId,
          receiveIdType: "chat_id",
          autoPair: false,
        }),
      );
    } catch (error) {
      this.log(`feishu:pair-save-error ${error}`);
    }
    this.setState({
      configured: true,
      message: "已自动配对，当前只接受绑定用户",
    });
    this.log(`feishu:paired ${openId}`);
    await this.sendText(
      chatId,
      "✅ 配对成功。以后这个机器人只接受你的飞书账号命令。\n发送 /help 查看可用命令。",
    );
  }

  async handleEvent(data) {
    const message = data?.message || {};
    const sender = data?.sender || {};
    const openId =
      sender?.sender_id?.open_id ||
      sender?.sender_id?.user_id ||
      "";
    const chatId = message.chat_id || "";
    const messageId = message.message_id || "";
    this.log(
      `feishu:event chat_type=${message.chat_type || ""} message_type=${
        message.message_type || ""
      } sender_type=${sender.sender_type || ""} chat=${chatId || "-"} open=${
        openId || "-"
      }`,
    );
    if (!chatId || sender.sender_type === "app") {
      return;
    }
    if (messageId) {
      if (this.seen.has(messageId)) {
        return;
      }
      this.seen.add(messageId);
      if (this.seen.size > 300) {
        this.seen.delete(this.seen.values().next().value);
      }
    }
    if (!this.allowed(openId) && this.canAutoPair(openId, chatId)) {
      await this.bindPair(openId, chatId);
    }
    if (!this.allowed(openId)) {
      this.log(`feishu:ignored ${openId || "unknown sender"}`);
      return;
    }
    let content = {};
    try {
      content = JSON.parse(message.content || "{}") || {};
    } catch {
      content = {};
    }
    if (message.message_type === "image") {
      await this.handleImage(chatId, message, content);
      return;
    }
    if (
      message.message_type === "file" ||
      message.message_type === "audio" ||
      message.message_type === "media" ||
      message.message_type === "video"
    ) {
      await this.handleAttachment(chatId, message, content);
      return;
    }
    if (message.message_type !== "text") {
      return;
    }
    let text = String(content.text || "");
    const mentions = Array.isArray(message.mentions)
      ? message.mentions
      : [];
    for (const mention of mentions) {
      if (mention?.key) {
        text = text.split(mention.key).join("");
      }
    }
    text = text.trim();
    if (!text) {
      return;
    }

    const command = text.split(/\s+/)[0].toLowerCase();
    if (command === "/approve" || command === "/deny") {
      await this.handleApprovalCommand(chatId, text, command === "/approve");
      return;
    }
    if (command === "/help") {
      await this.sendText(
        chatId,
        [
          "TesT · 飞书命令",
          "/status  查看连接状态",
          "/new     新建 Pi 会话",
          "/stop    中断当前任务",
          "/compact 压缩上下文",
          "/approve [审批码]  允许当前待审批操作",
          "/deny [审批码]     阻止当前待审批操作",
          "",
          "直接发普通文字，就是让 Pi 执行任务。",
        ].join("\n"),
      );
      return;
    }
    if (command === "/new") {
      this.send({ type: "new_session" });
      await this.sendText(chatId, "已开始新的 Pi 会话。");
      return;
    }
    if (command === "/stop") {
      this.send({ type: "abort" });
      await this.sendText(chatId, "已请求中断当前任务。");
      return;
    }
    if (command === "/compact") {
      this.send({ type: "compact" });
      await this.sendText(chatId, "正在压缩上下文，稍后会继续。");
      return;
    }
    if (command === "/status") {
      await this.sendText(
        chatId,
        [
          "TesT · 飞书通道",
          `连接：${this.state.message || this.state.state}`,
          `配对：${this.config.receiveId ? "已绑定" : "等待首次消息"}`,
          `白名单：${(this.config.allowedOpenIds || []).length} 人`,
          `待审批：${this.approvals.size} 条`,
          `模型：由 PC 端当前配置决定`,
          `队列：${this.pending.length} 条待回复`,
        ].join("\n"),
      );
      return;
    }

    this.queuePrompt(chatId, text);
  }

  pruneApprovals() {
    const cutoff = Date.now() - APPROVAL_TTL_MS;
    for (const [id, approval] of this.approvals) {
      if (approval.createdAt < cutoff) {
        this.approvals.delete(id);
      }
    }
  }

  async handleApprovalCommand(chatId, text, approved) {
    this.pruneApprovals();
    const token = String(text || "")
      .trim()
      .split(/\s+/)
      .slice(1)
      .join("")
      .toLowerCase();
    const candidates = [...this.approvals.values()].filter(
      (approval) => approval.chatId === chatId,
    );

    if (candidates.length === 0) {
      await this.sendText(chatId, "当前没有待审批操作。");
      return;
    }

    let approval = null;
    if (token) {
      approval =
        candidates.find(
          (item) =>
            item.code === token ||
            item.id.toLowerCase() === token ||
            item.id.toLowerCase().endsWith(token),
        ) || null;
      if (!approval) {
        await this.sendText(
          chatId,
          `审批码无效。当前待审批：${candidates
            .map((item) => item.code)
            .join("、")}`,
        );
        return;
      }
    } else if (candidates.length === 1) {
      approval = candidates[0];
    } else {
      await this.sendText(
        chatId,
        `当前有 ${candidates.length} 条待审批，请带审批码回复。\n${candidates
          .map((item) => `· /${approved ? "approve" : "deny"} ${item.code}`)
          .join("\n")}`,
      );
      return;
    }

    const payload =
      approval.method === "confirm"
        ? { confirmed: approved }
        : {
            value: approvalOption(approval.options, approved),
          };
    this.approvals.delete(approval.id);
    this.send({
      type: "extension_ui_response",
      id: approval.id,
      ...payload,
    });
    this.log(
      `feishu:approval ${approved ? "approve" : "deny"} ${approval.code}`,
    );
    await this.sendText(
      chatId,
      approved
        ? `✅ 已批准审批 ${approval.code}：${approval.title}`
        : `⛔ 已阻止审批 ${approval.code}：${approval.title}`,
    );
  }

  async handleExtensionRequest(record) {
    if (!isApprovalRequest(record)) {
      return;
    }
    this.pruneApprovals();
    const id = String(record.id || "");
    if (!id || this.approvals.has(id)) {
      return;
    }
    const chatId =
      this.pending.find((item) => !item.replied)?.chatId ||
      this.config?.receiveId ||
      "";
    if (!chatId) {
      this.log(`feishu:approval-no-chat ${id}`);
      return;
    }

    const title = String(record.title || "Pi 操作审批");
    const message = String(record.message || "").trim();
    const options = Array.isArray(record.options)
      ? record.options.map((option) => String(option))
      : [];
    const code = id.toLowerCase().slice(-8);
    this.approvals.set(id, {
      id,
      code,
      title,
      options,
      method: String(record.method || "select"),
      chatId,
      createdAt: Date.now(),
    });

    const preview =
      message.length > 1200 ? `${message.slice(0, 1200)}…` : message;
    await this.sendText(
      chatId,
      [
        "🔐 Pi 需要审批",
        title,
        preview,
        `审批码：${code}`,
        `回复 /approve ${code} 允许一次`,
        `回复 /deny ${code} 阻止`,
      ]
        .filter(Boolean)
        .join("\n"),
    );
    this.log(`feishu:approval-request ${code} ${title}`);
  }

  resolveApproval(id, source = "desktop") {
    const key = String(id || "");
    const approval = this.approvals.get(key);
    if (!approval) {
      return false;
    }
    this.approvals.delete(key);
    if (source !== "feishu") {
      void this.sendText(
        approval.chatId,
        `ℹ️ 审批 ${approval.code} 已在桌面端处理，飞书无需再操作。`,
      );
    }
    return true;
  }

  queuePrompt(chatId, text, images) {
    this.pending.push({ chatId, text, replied: false });
    this.send({
      type: "prompt",
      message: text,
      ...(images?.length ? { images } : {}),
      ...(this.busy ? { streamingBehavior: "followUp" } : {}),
    });
    this.log(`feishu:prompt ${text.slice(0, 80)}`);
  }

  async downloadResource(message, type) {
    const key =
      type === "image" ? message.imageKey : message.fileKey;
    if (!this.client || !key) {
      throw new Error("缺少飞书资源 key");
    }
    const resource = await this.client.im.messageResource.get({
      params: { type },
      path: {
        message_id: message.messageId,
        file_key: key,
      },
    });
    const chunks = [];
    for await (const chunk of resource.getReadableStream()) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async handleImage(chatId, message, content) {
    try {
      const buffer = await this.downloadResource(
        {
          messageId: message.message_id,
          imageKey: content.image_key,
        },
        "image",
      );
      const mimeType = imageMime(buffer);
      this.queuePrompt(chatId, "请查看我发送的图片。", [
        {
          type: "image",
          data: buffer.toString("base64"),
          mimeType,
        },
      ]);
    } catch (error) {
      await this.sendText(
        chatId,
        `图片下载失败：${String(error?.message || error).slice(0, 300)}`,
      );
    }
  }

  async handleAttachment(chatId, message, content) {
    try {
      const resourceType =
        message.message_type === "audio"
          ? "audio"
          : message.message_type === "media" ||
              message.message_type === "video"
            ? "video"
            : "file";
      const buffer = await this.downloadResource(
        {
          messageId: message.message_id,
          fileKey: content.file_key,
        },
        resourceType,
      );
      const name = sanitizeName(
        content.file_name ||
          content.name ||
          `feishu-${message.message_id}`,
      );
      const dir = path.join(os.tmpdir(), "tesT-feishu");
      fs.mkdirSync(dir, { recursive: true });
      const target = path.join(
        dir,
        `${String(message.message_id || Date.now()).slice(-8)}-${name}`,
      );
      fs.writeFileSync(target, buffer);
      const isText =
        buffer.length <= 512 * 1024 && !buffer.subarray(0, 8000).includes(0);
      if (isText) {
        this.queuePrompt(
          chatId,
          `请读取我发送的文件：\n<file path="${target}">\n${buffer
            .toString("utf8")
            .slice(0, 200000)}\n</file>`,
        );
      } else {
        this.queuePrompt(
          chatId,
          `我发送了一个${labelForType(
            message.message_type,
          )}，已保存到：${target}`,
        );
      }
    } catch (error) {
      await this.sendText(
        chatId,
        `文件下载失败：${String(error?.message || error).slice(0, 300)}`,
      );
    }
  }

  send(command) {
    const payload = {
      id: `feishu-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 6)}`,
      ...command,
      source: "feishu",
    };
    try {
      this.sendCommand(payload);
    } catch (error) {
      this.log(`feishu:send-error ${error}`);
    }
  }

  async handleRecord(record) {
    if (!record) {
      return;
    }
    if (record.type === "extension_ui_request") {
      await this.handleExtensionRequest(record);
      return;
    }
    if (record.type === "agent_start") {
      this.busy = true;
      return;
    }
    if (
      record.type === "message_end" &&
      record.message?.role === "assistant"
    ) {
      const text = extractText(record.message).trim();
      const target = this.pending[0];
      if (!target) {
        return;
      }
      if (text) {
        target.replied = true;
        await this.sendText(target.chatId, text);
      } else if (
        record.message.stopReason === "error" &&
        record.message.errorMessage
      ) {
        target.replied = true;
        await this.sendText(
          target.chatId,
          `Pi 请求失败：${String(record.message.errorMessage).slice(0, 500)}`,
        );
      }
      return;
    }
    if (record.type === "agent_settled") {
      this.busy = false;
      const targets = this.pending;
      this.pending = [];
      for (const target of targets) {
        if (!target.replied) {
          await this.sendText(
            target.chatId,
            "Pi 已完成本轮处理，但没有可发送的文本输出。",
          );
        }
      }
    }
  }

  async sendText(chatId, text) {
    if (!this.client || !chatId) {
      return;
    }
    const value = String(text || "").trim();
    if (!value) {
      return;
    }
    const chunks = [];
    for (let index = 0; index < value.length; index += 4500) {
      chunks.push(value.slice(index, index + 4500));
    }
    for (const chunk of chunks) {
      try {
        await this.client.im.message.create({
          params: { receive_id_type: "chat_id" },
          data: {
            receive_id: chatId,
            msg_type: "text",
            content: JSON.stringify({ text: chunk }),
          },
        });
      } catch (error) {
        this.setState({
          state: "error",
          message: "飞书消息发送失败",
          lastError: String(error?.message || error),
        });
        return;
      }
    }
  }
}

module.exports = { FeishuAgent };
