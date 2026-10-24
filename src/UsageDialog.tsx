import { useEffect, useMemo, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Check,
  Cpu,
  Folder,
  X,
  Zap,
} from "lucide-react";
import { Button } from "./Button";
import {
  formatCost,
  formatTokenCount,
  messageCount,
  type SessionStats,
  type UsageStats,
} from "./usage";

type UsageDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionStats: SessionStats | null;
  piStatus: "offline" | "connecting" | "ready" | "error";
  modelLabel: string;
  reasoning: string;
  workspace: string;
  budgetUsd: number;
  onBudgetUsd: (value: number) => void;
};

export default function UsageDialog({
  open,
  onOpenChange,
  sessionStats,
  piStatus,
  modelLabel,
  reasoning,
  workspace,
  budgetUsd,
  onBudgetUsd,
}: UsageDialogProps) {
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }
    const request = window.tesT?.usageStats?.();
    if (!request) {
      setUsage(null);
      setLoading(false);
      setError("当前环境不支持用量统计");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    request
      .then((result) => {
        if (cancelled) {
          return;
        }
        if (result?.error) {
          setError(result.error);
        }
        setUsage(result ?? null);
        setLoading(false);
      })
      .catch((reason) => {
        if (!cancelled) {
          setError(String(reason));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const days = useMemo(() => {
    const map = new Map(
      (usage?.days ?? []).map((day) => [day.date ?? "", day]),
    );
    const list: {
      key: string;
      label: string;
      cost: number;
      tokens: number;
      requests: number;
    }[] = [];
    for (let offset = 13; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      const key = `${date.getFullYear()}-${String(
        date.getMonth() + 1,
      ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const bucket = map.get(key);
      list.push({
        key,
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        cost: bucket?.cost ?? 0,
        tokens: bucket?.tokens ?? 0,
        requests: bucket?.requests ?? 0,
      });
    }
    return list;
  }, [usage]);

  const metricIsCost = days.some((day) => day.cost > 0);
  const peak = Math.max(
    0.0001,
    ...days.map((day) => (metricIsCost ? day.cost : day.tokens)),
  );
  const models = useMemo(() => {
    const list = [...(usage?.models ?? [])];
    if (metricIsCost) {
      return list.sort((a, b) => b.cost - a.cost).slice(0, 6);
    }
    return list.sort((a, b) => b.tokens - a.tokens).slice(0, 6);
  }, [usage, metricIsCost]);
  const activeDays = (usage?.days ?? []).filter(
    (day) => day.requests > 0,
  ).length;
  const statusLabel =
    piStatus === "ready"
      ? "已连接"
      : piStatus === "connecting"
        ? "连接中"
        : piStatus === "error"
          ? "连接异常"
          : "未连接";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="rx-overlay" />
        <DialogPrimitive.Content className="dialog usage-dialog">
          <div className="dialog-head">
            <div>
              <DialogPrimitive.Title className="dialog-title">
                状态与用量
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="dialog-desc">
                Pi 连接、本次会话与历史花费 · 只读
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="icon" aria-label="关闭">
                <X size={15} />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <div className="dialog-body usage-body">
            <div className="usage-status">
              <span className={`usage-chip ${piStatus}`}>
                <i />
                Pi {statusLabel}
              </span>
              <span className="usage-chip" title={modelLabel}>
                <Cpu size={11} />
                {modelLabel}
              </span>
              <span className="usage-chip">
                <Zap size={11} />
                {reasoning}
              </span>
              {workspace && (
                <span className="usage-chip wide" title={workspace}>
                  <Folder size={11} />
                  {workspace}
                </span>
              )}
            </div>

            <div className="usage-cards">
              <div className="usage-card">
                <small>累计花费</small>
                <b>{formatCost(usage?.total.cost)}</b>
              </div>
              <div className="usage-card">
                <small>累计 Tokens</small>
                <b>{formatTokenCount(usage?.total.tokens ?? 0)}</b>
              </div>
              <div className="usage-card">
                <small>模型请求</small>
                <b>{(usage?.total.requests ?? 0).toLocaleString()}</b>
              </div>
              <div className="usage-card">
                <small>活跃天数</small>
                <b>{activeDays}</b>
              </div>
            </div>

            <section className="usage-section">
              <div className="usage-section-head">
                <b>最近 14 天</b>
                <span>{metricIsCost ? "按花费" : "按 Tokens"}</span>
              </div>
              <div className="usage-chart">
                {days.map((day) => {
                  const value = metricIsCost ? day.cost : day.tokens;
                  const height = Math.max(
                    3,
                    Math.round((value / peak) * 64),
                  );
                  return (
                    <div
                      className={`usage-bar ${
                        value > 0 ? "has-value" : ""
                      }`}
                      key={day.key}
                      title={`${day.key} · ${formatCost(
                        day.cost,
                      )} · ${formatTokenCount(day.tokens)} tokens · ${
                        day.requests
                      } 次`}
                    >
                      <span
                        className="usage-bar-fill"
                        style={{ height: `${height}px` }}
                      />
                      <small>{day.label}</small>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="usage-section">
              <div className="usage-section-head">
                <b>模型用量</b>
                <span>Top {models.length || 0}</span>
              </div>
              {loading && <div className="usage-empty">正在统计会话…</div>}
              {!loading && error && (
                <div className="usage-empty">{error}</div>
              )}
              {!loading && !error && models.length === 0 && (
                <div className="usage-empty">
                  还没有带用量记录的 Pi 会话
                </div>
              )}
              {!loading &&
                models.map((item) => (
                  <div
                    className="usage-model"
                    key={`${item.provider}/${item.model}`}
                  >
                    <span className="usage-model-name">
                      <b>{item.model || "unknown"}</b>
                      <small>{item.provider}</small>
                    </span>
                    <span className="usage-model-num">
                      {formatCost(item.cost)}
                    </span>
                    <span className="usage-model-tokens">
                      {formatTokenCount(item.tokens)}
                    </span>
                    <span className="usage-model-req">
                      {item.requests} 次
                    </span>
                  </div>
                ))}
            </section>

            <section className="usage-section usage-budget">
              <div className="usage-section-head">
                <b>本次会话</b>
                <span>{formatCost(sessionStats?.cost)}</span>
              </div>
              <div className="usage-budget-row">
                <div>
                  <b>花费预算</b>
                  <small>超过后提示，不会中断 Pi</small>
                </div>
                <label className="usage-budget-input">
                  <span>$</span>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    step={0.5}
                    value={budgetUsd || ""}
                    placeholder="不限"
                    onChange={(event) =>
                      onBudgetUsd(Number(event.target.value) || 0)
                    }
                  />
                </label>
              </div>
              <div className="usage-budget-meta">
                <span>
                  累计 Tokens {formatTokenCount(sessionStats?.tokens.total ?? 0)}
                </span>
                <span>
                  工具 {sessionStats?.toolCalls ?? 0} 次
                </span>
                <span>
                  消息 {messageCount(sessionStats)} 条
                </span>
              </div>
            </section>
          </div>

          <div className="dialog-foot">
            <span className="muted">
              统计 Pi 会话文件中的 usage 记录 · 最多 400 个会话
            </span>
            <div>
              <DialogPrimitive.Close asChild>
                <Button variant="primary" icon={<Check size={13} />}>
                  完成
                </Button>
              </DialogPrimitive.Close>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
