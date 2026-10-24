import type {
  Dispatch,
  ReactNode,
  SetStateAction,
} from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import {
  Archive,
  ChevronDown,
  MessagesSquare,
  Pin,
  Plus,
  RotateCcw,
} from "lucide-react";
import { Button } from "./Button";
import type { Session } from "./session-types";
import { projectBasename } from "./session-utils";
import {
  assignedTagsForPath,
  type SessionTagDefinition,
  type SessionTagStore,
} from "./session-tags";

type SessionSidebarProps = {
  projectTreeIds: string[];
  allProjectsCollapsed: boolean;
  toggleAllProjects: () => void;
  newSession: () => void;
  refreshSessions: () => void;
  newScratchSession: () => void;
  filterableSessionTags: SessionTagDefinition[];
  activeSessionTag: string | null;
  setActiveSessionTag: Dispatch<SetStateAction<string | null>>;
  sessionTagCounts: Record<string, number>;
  pinnedSessions: Session[];
  activeSessionPath: string;
  selectSession: (session: Session) => void;
  prefetchSession: (session: Session) => void;
  sessionTagStore: SessionTagStore;
  projectView: ReactNode;
  hiddenProjects: string[];
  restoreProject: (project: string) => void;
};

export default function SessionSidebar({
  projectTreeIds,
  allProjectsCollapsed,
  toggleAllProjects,
  newSession,
  refreshSessions,
  newScratchSession,
  filterableSessionTags,
  activeSessionTag,
  setActiveSessionTag,
  sessionTagCounts,
  pinnedSessions,
  activeSessionPath,
  selectSession,
  prefetchSession,
  sessionTagStore,
  projectView,
  hiddenProjects,
  restoreProject,
}: SessionSidebarProps) {
  return (
    <aside className="sidebar" aria-label="项目与会话">
                    <div className="sidebar-top">
                      <div className="side-title">
                        <span>项目</span>
                        {projectTreeIds.length > 1 && (
                          <button
                            type="button"
                            className={`side-title-action ${
                              allProjectsCollapsed ? "collapsed" : ""
                            }`}
                            onClick={toggleAllProjects}
                            title={
                              allProjectsCollapsed
                                ? "展开全部项目"
                                : "收起全部项目"
                            }
                            aria-label={
                              allProjectsCollapsed
                                ? "展开全部项目"
                                : "收起全部项目"
                            }
                          >
                            <ChevronDown size={12} />
                          </button>
                        )}
                      </div>
                      <div className="side-actions">
                        <Button
                          variant="primary"
                          size="sm"
                          className="glass-primary"
                          onClick={newSession}
                        >
                          <Plus size={13} /> 新建会话
                        </Button>
                        <Button
                          variant="icon"
                          title="刷新会话列表"
                          aria-label="刷新会话列表"
                          onClick={refreshSessions}
                        >
                          <RotateCcw size={14} />
                        </Button>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="scratch-button"
                        onClick={newScratchSession}
                      >
                        <MessagesSquare size={12} /> 不在项目
                      </Button>
                      {filterableSessionTags.length > 0 && (
                        <div
                          className="session-tag-filter-bar"
                          aria-label="按标签筛选会话"
                        >
                          <button
                            type="button"
                            className={!activeSessionTag ? "active" : ""}
                            aria-pressed={!activeSessionTag}
                            onClick={() => setActiveSessionTag(null)}
                          >
                            全部
                          </button>
                          {filterableSessionTags.map((tag) => (
                            <button
                              key={tag.id}
                              type="button"
                              className={
                                activeSessionTag === tag.id ? "active" : ""
                              }
                              aria-pressed={activeSessionTag === tag.id}
                              onClick={() =>
                                setActiveSessionTag((current) =>
                                  current === tag.id ? null : tag.id,
                                )
                              }
                            >
                              <i
                                className={`session-tag-dot session-tag-color-${tag.color}`}
                              />
                              {tag.name}
                              <small>{sessionTagCounts[tag.id] ?? 0}</small>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <ScrollAreaPrimitive.Root className="session-scroll">
                      <ScrollAreaPrimitive.Viewport className="session-viewport">
                        <div className="session-list tree">
                          {pinnedSessions.length > 0 && (
                            <div className="pinned-group">
                              <div className="pinned-head">
                                <Pin size={11} />
                                <span>置顶</span>
                                <small>{pinnedSessions.length}</small>
                              </div>
                              {pinnedSessions.map((session) => (
                                <button type="button"
                                  key={`pin-${session.path}`}
                                  className={`pinned-session ${
                                    session.path === activeSessionPath
                                      ? "active"
                                      : ""
                                  }`}
                                  aria-current={
                                    session.path === activeSessionPath
                                      ? "page"
                                      : undefined
                                  }
                                  onClick={() => selectSession(session)}
                                  onPointerEnter={() => prefetchSession(session)}
                                  onFocus={() => prefetchSession(session)}
                                  title={session.title}
                                >
                                  <span className="pinned-session-title">
                                    <Pin size={10} />
                                    <span>{session.title}</span>
                                  </span>
                                  {session.path && (
                                    <span className="tree-session-tag-dots">
                                      {assignedTagsForPath(
                                        sessionTagStore,
                                        session.path,
                                      )
                                        .slice(0, 3)
                                        .map((tag) => (
                                          <i
                                            key={tag.id}
                                            className={`session-tag-dot session-tag-color-${tag.color}`}
                                          />
                                        ))}
                                    </span>
                                  )}
                                  <small>{session.meta}</small>
                                </button>
                              ))}
                            </div>
                          )}
                          {projectView}
                          {hiddenProjects.length > 0 && (
                            <div className="hidden-projects">
                              <div className="hidden-projects-head">
                                <Archive size={11} />
                                <span>已移除项目</span>
                                <small>{hiddenProjects.length}</small>
                              </div>
                              {hiddenProjects.map((project) => (
                                <button
                                  type="button"
                                  className="hidden-project-row"
                                  key={project}
                                  title={project}
                                  onClick={() => restoreProject(project)}
                                >
                                  <span>{projectBasename(project)}</span>
                                  <small>恢复</small>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </ScrollAreaPrimitive.Viewport>
                      <ScrollAreaPrimitive.Scrollbar
                        className="scroll-area-bar"
                        orientation="vertical"
                      >
                        <ScrollAreaPrimitive.Thumb className="scroll-area-thumb" />
                      </ScrollAreaPrimitive.Scrollbar>
                      <ScrollAreaPrimitive.Corner />
                    </ScrollAreaPrimitive.Root>

                    <div className="sidebar-foot">
                      <div className="foot-user">
                        <span className="avatar">U</span>
                        <div>
                          <b>本地用户</b>
                        </div>
                      </div>
                    </div>
                  </aside>
  );
}
