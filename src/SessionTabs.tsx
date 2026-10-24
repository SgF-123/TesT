import { FileText, Plus, X } from "lucide-react";
import type { Session, SessionTab } from "./session-types";

type SessionTabsProps = {
  tabs: SessionTab[];
  activePath: string;
  sessions: Session[];
  onPrefetch: (session: Session) => void;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
  onNewSession: () => void;
};

export default function SessionTabs({
  tabs,
  activePath,
  sessions,
  onPrefetch,
  onSelect,
  onClose,
  onNewSession,
}: SessionTabsProps) {
  if (tabs.length <= 1) {
    return null;
  }

  return (
    <div className="session-tabs" role="tablist" aria-label="打开的会话">
      {tabs.map((tab, index) => (
        <div
          className={`session-tab ${tab.path === activePath ? "on" : ""}`}
          key={tab.path}
        >
          <button
            type="button"
            className="session-tab-main"
            role="tab"
            title={`${tab.title} · Alt+${index + 1}`}
            aria-keyshortcuts={`Alt+${index + 1}`}
            aria-selected={tab.path === activePath}
            onPointerEnter={() => {
              const session = sessions.find((item) => item.path === tab.path);
              if (session) onPrefetch(session);
            }}
            onFocus={() => {
              const session = sessions.find((item) => item.path === tab.path);
              if (session) onPrefetch(session);
            }}
            onClick={() => onSelect(tab.path)}
          >
            <FileText size={11} />
            <span className="session-tab-index">{index + 1}</span>
            <span>{tab.title}</span>
          </button>
          <button
            type="button"
            className="session-tab-close"
            aria-label={`关闭 ${tab.title}`}
            onClick={() => onClose(tab.path)}
          >
            <X size={9} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="session-tab-new"
        title="新建会话"
        onClick={onNewSession}
      >
        <Plus size={11} />
      </button>
    </div>
  );
}
