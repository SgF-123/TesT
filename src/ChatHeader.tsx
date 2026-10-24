import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Cpu,
  MoreHorizontal,
  PanelRight,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "./Button";
import type { Model } from "./settings-config";
import { Tooltip } from "./Tooltip";

type ChatHeaderProps = {
  isShell: boolean;
  sessionName: string;
  sessionTitle?: string;
  sessionMeta?: string;
  model: Model;
  pending: boolean;
  piReady: boolean;
  onConfigureModel?: () => void;
  onToggleContext: () => void;
  onRename?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
};

export function ChatHeader({
  isShell,
  sessionName,
  sessionTitle,
  sessionMeta,
  model,
  pending,
  piReady,
  onConfigureModel,
  onToggleContext,
  onRename,
  onArchive,
  onDelete,
}: ChatHeaderProps) {
  return (
    <div className="chat-head">
      <div className="chat-title">
        <div className="crumbs">
          <span className="crumb-back">会话</span>
          <ChevronRight size={11} />
          <span className="crumb-cur">
            {isShell ? sessionName || sessionTitle || "新会话" : sessionTitle || "新会话"}
          </span>
        </div>
        <div className="chat-sub">
          {model.id ? (
            <span className="badge badge-mint">
              <i className="dot" />
              {pending ? "运行中" : "就绪"}
            </span>
          ) : (
            <button
              type="button"
              className="badge badge-amber badge-action"
              onClick={onConfigureModel}
              aria-label="配置模型"
              title="选择模型后才能开始执行任务"
            >
              <i className="dot" />
              配置模型
              <ChevronRight size={10} />
            </button>
          )}
          {model.id && (
            <span
              className="chat-model-chip"
              title={`${model.label} · ${model.provider || "Pi"}`}
            >
              <Cpu size={10} />
              {model.short}
            </span>
          )}
          {(!isShell || !piReady) && (
            <span>{isShell ? "连接中" : sessionMeta || ""}</span>
          )}
        </div>
      </div>
      <div className="chat-actions">
        <Tooltip tip="上下文面板">
          <Button
            variant="icon"
            onClick={onToggleContext}
            title="切换上下文面板"
          >
            <PanelRight size={15} />
          </Button>
        </Tooltip>
        <DropdownMenuPrimitive.Root>
          <DropdownMenuPrimitive.Trigger asChild>
            <Button
              variant="icon"
              title="会话操作"
              aria-label="会话操作"
            >
              <MoreHorizontal size={15} />
            </Button>
          </DropdownMenuPrimitive.Trigger>
          <DropdownMenuPrimitive.Portal>
            <DropdownMenuPrimitive.Content
              className="menu-content"
              align="end"
              sideOffset={6}
            >
              <DropdownMenuPrimitive.Label className="menu-label">
                会话
              </DropdownMenuPrimitive.Label>
              <DropdownMenuPrimitive.Item
                className="menu-item"
                onSelect={onRename}
              >
                <Pencil size={13} /> 重命名
              </DropdownMenuPrimitive.Item>
              <DropdownMenuPrimitive.Item
                className="menu-item"
                onSelect={onArchive}
              >
                <Archive size={13} /> 归档会话
              </DropdownMenuPrimitive.Item>
              <DropdownMenuPrimitive.Separator className="menu-sep" />
              <DropdownMenuPrimitive.Item
                className="menu-item danger"
                onSelect={onDelete}
              >
                <Trash2 size={13} /> 删除会话
              </DropdownMenuPrimitive.Item>
            </DropdownMenuPrimitive.Content>
          </DropdownMenuPrimitive.Portal>
        </DropdownMenuPrimitive.Root>
      </div>
    </div>
  );
}

type ChatFindBarProps = {
  open: boolean;
  query: string;
  matchCount: number;
  activeIndex: number;
  onQueryChange: (value: string) => void;
  onStep: (direction: -1 | 1) => void;
  onClose: () => void;
};

export function ChatFindBar({
  open,
  query,
  matchCount,
  activeIndex,
  onQueryChange,
  onStep,
  onClose,
}: ChatFindBarProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="findbar">
      <Search size={13} />
      <input
        autoFocus
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onClose();
          } else if (event.key === "Enter") {
            event.preventDefault();
            if (matchCount > 0) {
              onStep(event.shiftKey ? -1 : 1);
            }
          }
        }}
        placeholder="在当前会话中查找…"
      />
      <span className="find-count">
        {query.trim()
          ? matchCount
            ? `${activeIndex + 1}/${matchCount}`
            : "0/0"
          : ""}
      </span>
      <button
        type="button"
        className="find-nav"
        aria-label="上一个"
        onClick={() => onStep(-1)}
      >
        <ChevronLeft size={12} />
      </button>
      <button
        type="button"
        className="find-nav"
        aria-label="下一个"
        onClick={() => onStep(1)}
      >
        <ChevronRight size={12} />
      </button>
      <button
        type="button"
        className="find-nav"
        aria-label="关闭查找"
        onClick={onClose}
      >
        <X size={12} />
      </button>
    </div>
  );
}
