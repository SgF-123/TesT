import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Copy,
  Power,
  RotateCcw,
  Smartphone,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { Button } from "./Button";
import { copyText } from "./clipboard";
import { Tag } from "./Tag";

function RemoteDialog({
  open,
  onOpenChange,
  status,
  onStart,
  onStop,
  onRefresh,
  onStartTunnel,
  onStopTunnel,
  onNotify,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: TesTRemoteStatus | null;
  onStart: () => void;
  onStop: () => void;
  onRefresh: () => void;
  onStartTunnel: () => void;
  onStopTunnel: () => void;
  onNotify: (title: string, desc?: string) => void;
}) {
  const running = Boolean(status?.running);
  const url = status?.url || "";
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="rx-overlay" />
        <DialogPrimitive.Content className="dialog remote-dialog">
          <div className="dialog-head">
            <div>
              <DialogPrimitive.Title className="dialog-title">
                手机远程
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="dialog-desc">
                同一 Wi-Fi 下扫码，用手机继续让 Pi 干活
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="icon" aria-label="关闭">
                <X size={15} />
              </Button>
            </DialogPrimitive.Close>
          </div>

          {!running ? (
            <div className="remote-start">
              <span className="remote-start-icon">
                <Smartphone size={28} />
              </span>
              <b>让手机接管当前 Pi 会话</b>
              <p>
                开启后会生成一个局域网地址和二维码。手机与电脑连同一个
                Wi-Fi，扫码即可继续对话、看流式输出、切换 PC 上的历史会话、
                发语音指令和切换模型。手机浏览器里也可以“添加到主屏幕”，
                当成独立 App 使用。
              </p>
              <Button variant="primary" onClick={onStart}>
                <Wifi size={13} /> 启动手机远程
              </Button>
              {status?.error && (
                <p className="preset-error">{status.error}</p>
              )}
            </div>
          ) : (
            <div className="remote-body">
              <div className="remote-qr">
                {status?.qrSvg ? (
                  <div
                    className="remote-qr-svg"
                    dangerouslySetInnerHTML={{ __html: status.qrSvg }}
                  />
                ) : (
                  <div className="remote-qr-empty">二维码生成中…</div>
                )}
              </div>

              <div className="remote-info">
                <div className="remote-status-row">
                  <span className="remote-live">
                    <i /> 运行中
                  </span>
                  <span>{status?.clients || 0} 台设备</span>
                  <span>端口 {status?.port || "—"}</span>
                </div>
                <div className="remote-url">
                  <code>{url}</code>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      const ok = await copyText(url);
                      onNotify(
                        ok ? "已复制远程地址" : "复制失败",
                        ok ? url : "请手动选择地址复制",
                      );
                    }}
                  >
                    <Copy size={12} /> 复制
                  </Button>
                </div>
                <div
                  className={`remote-public ${
                    status?.publicUrl ? "on" : ""
                  }`}
                >
                  <div className="remote-public-head">
                    <b>
                      {status?.publicUrl
                        ? "公网访问已开启"
                        : "外网访问"}
                    </b>
                    {status?.publicUrl && (
                      <Tag tone="mint">Serveo</Tag>
                    )}
                  </div>
                  <p>
                    {status?.publicUrl
                      ? "现在可以在任何网络下扫码或打开上面的地址。请勿把链接分享给他人。"
                      : "开启 Serveo 临时公网隧道后，手机在别的地方也能连。"}
                  </p>
                  {status?.publicUrl ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<WifiOff size={12} />}
                      onClick={onStopTunnel}
                    >
                      关闭公网
                    </Button>
                  ) : status?.tunnelState === "downloading" ||
                    status?.tunnelState === "starting" ? (
                    <span className="remote-tunnel-progress">
                      {status?.tunnelMessage || "正在建立公网隧道…"}
                    </span>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={onStartTunnel}
                    >
                      <Wifi size={12} /> 开启外网访问
                    </Button>
                  )}
                  {status?.tunnelError && (
                    <p className="preset-error">{status.tunnelError}</p>
                  )}
                </div>
                <div className="remote-addresses">
                  {(status?.urls || []).map((entry) => (
                    <div key={entry.url}>
                      <span>
                        {entry.kind === "tailscale"
                          ? "Tailscale"
                          : entry.name}
                      </span>
                      <code>{entry.address}</code>
                    </div>
                  ))}
                </div>
                {status?.localOnly && (
                  <p className="remote-warning">
                    没有检测到局域网 IPv4 地址，手机可能无法连接。
                  </p>
                )}
                {status?.error && (
                  <p className="preset-error">{status.error}</p>
                )}
                <div className="remote-actions">
                  <Button variant="secondary" onClick={onRefresh}>
                    <RotateCcw size={12} /> 刷新令牌
                  </Button>
                  <Button
                    variant="ghost"
                    icon={<Power size={12} />}
                    onClick={onStop}
                  >
                    停止远程
                  </Button>
                </div>
                <p className="remote-note">
                  默认仅限同一局域网；开启外网后可在任何网络使用。首次启动如
                  Windows 防火墙弹窗，请允许“专用网络”。外网隧道由
                  Serveo 提供，地址是临时的，断开后失效。首次打开公网地址可能看到
                  Serveo 提示页，继续访问即可。刷新令牌或停止远程后，旧二维码立即失效。
                  手机端会记住令牌，之后可从主屏幕直接打开；令牌失效时重新扫码即可。
                  长期稳定使用可安装 Tailscale，手机和电脑登录同一
                  tailnet 后，Tailscale 地址会自动出现在上方。
                </p>
              </div>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export default RemoteDialog;
