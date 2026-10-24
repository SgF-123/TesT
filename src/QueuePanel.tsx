import { useState } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import {
  CornerUpLeft,
  ListOrdered,
  Navigation,
  Trash2,
} from "lucide-react";
import type { QueueEntry } from "./queue";

type QueuePanelProps = {
  items: QueueEntry[];
  expectedCount: number;
  busy: boolean;
  onTakeBack: (item: QueueEntry) => void;
  onDelete: (item: QueueEntry) => void;
  onSteer: (item: QueueEntry) => void;
  onTakeBackAll: () => void;
};

export default function QueuePanel({
  items,
  expectedCount,
  busy,
  onTakeBack,
  onDelete,
  onSteer,
  onTakeBackAll,
}: QueuePanelProps) {
  const [open, setOpen] = useState(false);
  if (expectedCount <= 0) {
    return null;
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          className={`queue-pill ${busy ? "is-busy" : ""}`}
          title="查看待发送队列"
          aria-label={`查看待发送队列，共 ${expectedCount} 条`}
        >
          <ListOrdered size={11} />
          排队 {expectedCount}
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className="queue-panel-content"
          side="top"
          align="end"
          sideOffset={9}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <div className="queue-panel-head">
            <span>
              <ListOrdered size={12} />
              待发送队列
              <small>{expectedCount}</small>
            </span>
            <button
              type="button"
              disabled={busy || items.length === 0}
              onClick={onTakeBackAll}
            >
              全部取回
            </button>
          </div>

          <div className="queue-panel-list">
            {items.length > 0 ? (
              items.map((item) => (
                <div
                  key={item.id}
                  className="queue-row"
                  data-kind={item.kind}
                >
                  <span className="queue-row-kind">
                    {item.kind === "steering" ? "引导" : "后续"}
                  </span>
                  <button
                    type="button"
                    className="queue-row-text"
                    title="取回编辑"
                    disabled={busy}
                    onClick={() => onTakeBack(item)}
                  >
                    {item.text}
                  </button>
                  <div className="queue-row-actions">
                    {item.kind === "followUp" && (
                      <button
                        type="button"
                        title="转为引导，当前工具批次结束后立即生效"
                        aria-label="转为引导"
                        disabled={busy}
                        onClick={() => onSteer(item)}
                      >
                        <Navigation size={11} />
                      </button>
                    )}
                    <button
                      type="button"
                      title="取回编辑"
                      aria-label="取回编辑"
                      disabled={busy}
                      onClick={() => onTakeBack(item)}
                    >
                      <CornerUpLeft size={11} />
                    </button>
                    <button
                      type="button"
                      className="is-danger"
                      title="从队列删除"
                      aria-label="从队列删除"
                      disabled={busy}
                      onClick={() => onDelete(item)}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="queue-panel-syncing">
                {busy ? "正在调整队列…" : "正在同步队列内容…"}
              </div>
            )}
          </div>
          <p className="queue-panel-note">
            取回或删除时会先清空 Pi 队列，再按原顺序恢复剩余消息。
          </p>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
