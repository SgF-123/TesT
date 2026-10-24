import type { ComponentProps, RefObject } from "react";
import {
  ArrowDown,
  ChevronUp,
  Command,
  Copy,
  Paperclip,
  RotateCcw,
  Settings2,
  Sparkles,
  ThumbsUp,
} from "lucide-react";
import emptyBug from "./assets/empty-bug.png";
import type { ChatMessage } from "./chat-types";
import { CodeCard, PlanCard, StreamingBubble } from "./ChatExtras";
import { copyText } from "./clipboard";
import { DotSpinner } from "./Loading";
import { MessageRow } from "./MessageRow";
import { ProcessRail, ToolCard } from "./ProcessRail";
import type { LiveThinking, LiveTool } from "./process-types";
import SelectionToolbar from "./SelectionToolbar";
import type { Model } from "./settings-config";
import type { TurnNavigationItem } from "./turn-navigation";
import TurnNavigator from "./TurnNavigator";

type Notify = (title: string, desc?: string) => void;

type DemoConversationProps = {
  model: Model;
  sent: string[];
  pending: boolean;
  notify: Notify;
};

function DemoConversation({
  model,
  sent,
  pending,
  notify,
}: DemoConversationProps) {
  return (
    <>
      <div className="message user">
        <div className="msg-meta">你 · 14:02</div>
        <div className="bubble user-bubble">
          帮我把这个项目的桌面端骨架搭起来，先只做界面，不接后端。
        </div>
      </div>

      <div className="message assistant">
        <div className="msg-meta">
          <span className="model-chip">
            <span className="model-dot" />
            {model.label}
          </span>
          <span>14:03</span>
        </div>

        <p>先把信息层级定下来，再动代码。三栏工作台：</p>
        <ul>
          <li>左侧：项目与会话树，支持搜索、标签、未读</li>
          <li>中间：文档式消息流，工具调用折叠成卡片</li>
          <li>右侧：当前上下文，模型、目录、分支、用量</li>
        </ul>

        <div className="tool-stack">
          <ToolCard name="read" target="src/App.tsx" duration="124 ms">
            <div className="tool-line">
              <span className="tk">ok</span>
              读取 42 行 · 1 个导入块 · 0 个警告
            </div>
          </ToolCard>
          <ToolCard name="edit" target="src/styles.css" state="running">
            <div className="tool-line">
              <span className="tk">…</span>
              正在写入样式 token 与卡片层级
            </div>
          </ToolCard>
        </div>

        <PlanCard />

        <p>骨架先固定间距与状态，再接 Pi RPC：</p>
        <CodeCard
          lang="tsx"
          code={`<div className="layout">
  <aside className="sidebar" />
  <main className="chat" />
  <aside className="context" />
</div>`}
        />

        <div className="msg-actions">
          <button
            type="button"
            onClick={async () => {
              const ok = await copyText("先把信息层级定下来，再动代码。");
              if (ok) notify("已复制回复");
            }}
          >
            <Copy size={12} /> 复制
          </button>
          <button
            type="button"
            onClick={() => notify("已重新生成", "沿用当前上下文")}
          >
            <RotateCcw size={12} /> 重试
          </button>
          <button
            type="button"
            aria-label="这条回复有帮助"
            title="这条回复有帮助"
            onClick={() => notify("已记录反馈")}
          >
            <ThumbsUp size={12} />
          </button>
        </div>
      </div>

      {sent.map((item, index) => (
        <div className="message user" key={`${item}-${index}`}>
          <div className="msg-meta">你 · 现在</div>
          <div className="bubble user-bubble">{item}</div>
        </div>
      ))}

      {pending && (
        <div className="message assistant" role="status" aria-live="polite">
          <div className="thinking">
            <DotSpinner />
            <span>Pi 正在思考…</span>
          </div>
        </div>
      )}
    </>
  );
}

type ChatMessageFlowProps = {
  isShell: boolean;
  model: Model;
  messagesLoading: boolean;
  historyLoading: boolean;
  liveMessages: ChatMessage[];
  visibleLiveMessages: ChatMessage[];
  hiddenMessageCount: number;
  pending: boolean;
  streamActive: boolean;
  liveTools: LiveTool[];
  liveThinking: LiveThinking[];
  sent: string[];
  workspaceCwd: string;
  findMatches: string[];
  findIndex: number;
  findMatchSet: ReadonlySet<string>;
  turnNumberById: ReadonlyMap<string, number>;
  activeTurnBookmarks: ReadonlySet<string>;
  turnNavigationItems: TurnNavigationItem[];
  currentTurn: TurnNavigationItem | null;
  showTurnNavigation: boolean;
  showScrollTop: boolean;
  showScrollLatest: boolean;
  unseenMessages: number;
  messagesRef: RefObject<HTMLDivElement | null>;
  notify: Notify;
  onShowEarlier: () => void;
  onToggleBookmark: (messageId: string) => void;
  onEditMessage: (messageId: string, text: string) => void;
  onRetryMessage: (messageId: string) => void;
  onLocateTurn: (messageId: string, behavior?: ScrollBehavior) => void;
  onMessagesScroll: () => void;
  onScrollTop: () => void;
  onScrollLatest: () => void;
  onAddAnnotation: ComponentProps<typeof SelectionToolbar>["onAdd"];
  onStart: () => void;
  onAddContext: () => void;
  onOpenCommands: () => void;
  onOpenModelSettings: () => void;
};

export function ChatMessageFlow({
  isShell,
  model,
  messagesLoading,
  historyLoading,
  liveMessages,
  visibleLiveMessages,
  hiddenMessageCount,
  pending,
  streamActive,
  liveTools,
  liveThinking,
  sent,
  workspaceCwd,
  findMatches,
  findIndex,
  findMatchSet,
  turnNumberById,
  activeTurnBookmarks,
  turnNavigationItems,
  currentTurn,
  showTurnNavigation,
  showScrollTop,
  showScrollLatest,
  unseenMessages,
  messagesRef,
  notify,
  onShowEarlier,
  onToggleBookmark,
  onEditMessage,
  onRetryMessage,
  onLocateTurn,
  onMessagesScroll,
  onScrollTop,
  onScrollLatest,
  onAddAnnotation,
  onStart,
  onAddContext,
  onOpenCommands,
  onOpenModelSettings,
}: ChatMessageFlowProps) {
  return (
    <div
      className={`messages-shell ${
        showTurnNavigation ? "has-turn-rail" : ""
      }`}
    >
      <div
        className="messages"
        ref={messagesRef}
        onScroll={onMessagesScroll}
        aria-busy={messagesLoading}
      >
        <div className="thread">
          {!isShell && (
            <DemoConversation
              model={model}
              sent={sent}
              pending={pending}
              notify={notify}
            />
          )}

          {isShell && (
            <>
              {(messagesLoading || historyLoading) && (
                <div
                  className="empty-chat messages-loading"
                  role="status"
                  aria-live="polite"
                >
                  <div className="thinking">
                    <DotSpinner />
                    <span>正在载入会话…</span>
                  </div>
                </div>
              )}

              {!messagesLoading &&
                !historyLoading &&
                liveMessages.length === 0 &&
                !pending && (
                  <div className="empty-chat">
                    <img className="empty-bug" src={emptyBug} alt="" />
                    <h3>从一句话开始</h3>
                    <p className="empty-copy">
                      {model.id
                        ? "直接输入任务，或把文件拖进下方输入框作为上下文。"
                        : "先选择一个模型，再描述任务或附加文件。"}
                    </p>
                    <div className="empty-actions">
                      <button
                        type="button"
                        className="empty-action primary"
                        onClick={model.id ? onStart : onOpenModelSettings}
                      >
                        {model.id ? (
                          <Sparkles size={13} />
                        ) : (
                          <Settings2 size={13} />
                        )}
                        {model.id ? "开始输入" : "配置模型"}
                      </button>
                      <button
                        type="button"
                        className="empty-action"
                        onClick={onAddContext}
                      >
                        <Paperclip size={13} />
                        添加文件
                      </button>
                      <button
                        type="button"
                        className="empty-action"
                        onClick={onOpenCommands}
                      >
                        <Command size={13} />
                        命令面板
                      </button>
                    </div>
                    <div className="empty-shortcuts">
                      <span>
                        <kbd>Enter</kbd> 发送
                      </span>
                      <span>
                        <kbd>Shift</kbd> + <kbd>Enter</kbd> 换行
                      </span>
                    </div>
                  </div>
                )}

              {hiddenMessageCount > 0 && (
                <button
                  type="button"
                  className="load-earlier-messages"
                  onClick={onShowEarlier}
                >
                  <ChevronUp size={12} />
                  显示更早的 {Math.min(120, hiddenMessageCount)} 条消息
                  <small>还有 {hiddenMessageCount} 条未渲染</small>
                </button>
              )}

              {visibleLiveMessages.map((message) => (
                <MessageRow
                  key={message.id}
                  message={message}
                  modelLabel={model.label}
                  cwd={workspaceCwd}
                  findState={
                    findMatches[findIndex] === message.id
                      ? "hit"
                      : findMatchSet.has(message.id)
                        ? "match"
                        : ""
                  }
                  turnNumber={turnNumberById.get(message.id)}
                  bookmarked={activeTurnBookmarks.has(message.id)}
                  onToggleBookmark={onToggleBookmark}
                  onNotify={notify}
                  onEdit={onEditMessage}
                  onRetry={onRetryMessage}
                />
              ))}

              <ProcessRail
                tools={liveTools}
                thinking={liveThinking}
                active={pending || streamActive}
                cwd={workspaceCwd}
                focusTurn={showTurnNavigation ? currentTurn : null}
                onNotify={notify}
              />

              {streamActive && <StreamingBubble model={model} />}

              {pending && !streamActive && (
                <div
                  className="message assistant"
                  role="status"
                  aria-live="polite"
                >
                  <div className="thinking">
                    <DotSpinner />
                    <span>Pi 正在思考…</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <TurnNavigator
        turns={turnNavigationItems}
        bookmarkedIds={activeTurnBookmarks}
        scrollRef={messagesRef}
        onLocate={onLocateTurn}
        onToggleBookmark={onToggleBookmark}
      />
      <SelectionToolbar containerRef={messagesRef} onAdd={onAddAnnotation} />
      {(showScrollTop || (showScrollLatest && liveMessages.length > 0)) && (
        <div className="chat-nav">
          {showScrollTop && (
            <button
              type="button"
              className="chat-nav-top"
              onClick={onScrollTop}
              title="回到开头"
              aria-label="回到开头"
            >
              <ChevronUp size={14} />
            </button>
          )}
          {showScrollLatest && liveMessages.length > 0 && (
            <button
              type="button"
              className="scroll-latest"
              onClick={onScrollLatest}
              title="回到最新消息"
            >
              <ArrowDown size={13} />
              回到最新
              {unseenMessages > 0 && (
                <span className="nav-count">
                  {Math.min(99, unseenMessages)}
                </span>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
