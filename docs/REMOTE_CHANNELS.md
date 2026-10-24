# 远程通道（Remote Channels）

当前远程通道只有飞书一个正式实现。

## 实现文件

- `electron/feishu-agent.cjs`：飞书长连接、消息收发、配对、审批和推送
- `electron/channels/feishu-config.cjs`：本机配置读写
- `electron/preload.cjs`：`remoteChannels()` 只读状态接口
- `electron/main.cjs`：`tesT:remote-channels` IPC

飞书通道当前支持：

- 文本消息
- 审批请求与回答
- 任务完成推送

尚未支持：

- 卡片消息
- 文件与图片
- 已发送消息编辑
- 本地消息持久化

## 数据流

```text
Feishu event
    │
    ▼
FeishuAgent
    │  Pi JSONL
    ▼
  PiBridge
```

PC 端与飞书共用同一个 Pi sidecar。飞书只负责把消息转换成 Pi 命令，并把关键事件回传给用户，不维护第二套会话系统。

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

## 配置结构

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

凭证校验只发飞书官方请求，不写入对话历史。

## 后续计划

1. 把工具执行过程映射成飞书卡片
2. 支持文件和图片
3. 支持消息编辑与更细的任务进度
4. 最后再决定是否做 Windows 服务自启

## 当前边界

- PC 端仍由用户手动启动 TesT
- 不做开机自启
- 飞书消息不做本地持久化
- 长连接重连由飞书 SDK 管理，不保证无限重试
