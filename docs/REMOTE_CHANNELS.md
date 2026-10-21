# 远程通道接口（Remote Channels）

当前阶段只定义接口，不做飞书接入处理：

- 不安装飞书 SDK
- 不建立 WebSocket
- 不读取飞书消息
- 不自动启动
- 不改 PC 端现有执行链路

## 目标

把“手机端从哪里发命令”和“Pi 怎么执行”解耦。飞书、PWA、局域网、以后可能的其他 IM 都实现同一套通道契约。

```text
Feishu / PWA / LAN
        │  RemoteCommand
        ▼
  ChannelAdapter
        │  Pi JSONL
        ▼
     PiBridge
```

## 文件

- `electron/channels/contract.cjs`：命令、消息、状态、能力定义
- `electron/channels/feishu.cjs`：飞书通道骨架和配置校验
- `electron/channels/feishu-config.cjs`：本机配置读写（App Secret 用 safeStorage 加密）
- `electron/channels/index.cjs`：通道注册表
- `electron/preload.cjs`：`remoteChannels()` 只读状态接口
- `electron/main.cjs`：`tesT:remote-channels` IPC

## 可视化配置

设置 → 飞书：

- App ID
- App Secret（密码框；已保存时留空表示不修改）
- 自动配对（首次消息自动绑定 open_id / chat_id）
- 接收 ID 类型 / 默认接收 ID
- 允许的 Open ID（每行一个）
- 允许所有用户（默认关闭）
- 启用飞书通道

配置保存在：

- 开发态：`tesT/data/feishu.json`
- 安装态：`%APPDATA%\TesT\feishu.json`

App Secret 在 Windows 上通过 Electron `safeStorage`（DPAPI）加密后写入，前端只拿得到 `hasSecret` 标记。

开启自动配对后，首次给机器人发消息会：

1. 记录发送者的 `open_id`
2. 记录当前 `chat_id`
3. 写回配置并关闭自动配对
4. 回复“配对成功”

之后只接受已绑定用户的命令。

## 命令契约

允许的 `type`：

- `prompt`
- `steer`
- `follow_up`
- `abort`
- `new_session`
- `switch_session`
- `set_model`
- `set_thinking_level`
- `compact`
- `get_state`
- `get_messages`
- `get_available_models`
- `get_session_stats`

所有命令统一经过 `normalizeCommand()`：

- 校验类型
- 补 `id`
- 补 `source`
- 校验 `prompt` / `steer` / `follow_up` 的 `message`
- 校验 `switch_session.sessionPath`
- 校验 `set_model.provider` / `modelId`

## 消息契约

统一消息信封：

```js
{
  id: "msg-...",
  kind: "text",       // text | markdown | card | file | image | voice | status
  text: "...",
  title: "...",
  replyTo: "...",
  meta: {}
}
```

通道适配器负责把内部事件翻译成自己的消息格式；卡片、按钮、文件等平台差异放在 `meta`。

## 通道能力

`ChannelAdapter.capabilities` 当前包含：

```js
{
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
  editMessage: false
}
```

飞书骨架声明支持 `text`、`markdown`、`cards`、`buttons`、`files`、`images`、`push`、`editMessage`，但 `send()` / `update()` 目前抛出 `CHANNEL_NOT_IMPLEMENTED`。

## 飞书配置骨架

```js
{
  appId: "",
  appSecret: "",
  enabled: false,
  longConnection: true,
  receiveIdType: "chat_id", // chat_id | open_id | user_id | email
  receiveId: "",
  allowedOpenIds: [],
  allowAll: false
}
```

`validateFeishuConfig()` 只做本地校验，不发网络请求。`redactFeishuConfig()` 用于把 `appSecret` 隐藏后再传给 UI。

## 后续接入时才做

1. 安装 `@larksuiteoapi/node-sdk`
2. 创建飞书自建应用并开启机器人 + 长连接
3. 把 `im.message.receive_v1` 转成 `RemoteCommand`
4. 把 `message_update` / `tool_execution_*` 转成飞书卡片更新
5. 从 `feishu.json` 读取已加密的 `appSecret`
6. 加允许用户/群白名单
7. 最后再决定是否做 Windows 服务自启

## 当前边界

- PC 端仍由用户手动启动 TesT
- 不做开机自启
- 不做飞书网络连接
- 不做消息持久化
- 不做自动重连
