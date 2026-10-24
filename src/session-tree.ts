import { relativeSessionTime } from "./time-format";
import type { Session, SessionInfo, TreeNode } from "./session-types";
import { projectBasename } from "./session-utils";

export function buildSessionTree(sessions: SessionInfo[]): TreeNode {
  const root: TreeNode = { name: "Pi", children: [] };
  const projects = new Map<string, TreeNode>();

  for (const info of sessions) {
    const rawCwd = (info.cwd || "").replace(/[\\/]+$/, "").trim();
    const key = rawCwd || "未分组";
    let project = projects.get(key);
    if (!project) {
      project = {
        name: rawCwd ? projectBasename(rawCwd) : "未分组",
        children: [],
        sessions: [],
        fullPath: rawCwd || undefined,
      };
      projects.set(key, project);
      root.children?.push(project);
    }

    project.sessions ??= [];
    project.sessions.push({
      title: info.name || info.firstMessage || "新会话",
      meta: relativeSessionTime(info.modified),
      path: info.path,
      id: info.id,
      cwd: info.cwd,
      messageCount: info.messageCount,
      modified: info.modified,
      parentPath: info.parentSessionPath || undefined,
    });
  }

  const nameCounts = new Map<string, number>();
  for (const project of root.children ?? []) {
    nameCounts.set(project.name, (nameCounts.get(project.name) || 0) + 1);
  }
  for (const project of root.children ?? []) {
    if ((nameCounts.get(project.name) || 0) > 1 && project.fullPath) {
      const parts = project.fullPath.split(/[\\/]+/).filter(Boolean);
      project.name = parts.slice(-2).join("/") || project.fullPath;
    }
  }

  const nestSessions = (node: TreeNode) => {
    const sessions = node.sessions ?? [];
    if (sessions.length > 1) {
      const byPath = new Map(
        sessions
          .filter((session) => session.path)
          .map((session) => [session.path as string, session]),
      );
      const children = new Map<string, Session[]>();
      const roots: Session[] = [];
      for (const session of sessions) {
        const parent =
          session.parentPath && byPath.get(session.parentPath);
        if (parent && parent !== session) {
          const list = children.get(parent.path as string) || [];
          list.push(session);
          children.set(parent.path as string, list);
        } else {
          roots.push(session);
        }
      }
      const sortByModified = (a: Session, b: Session) =>
        new Date(b.modified || 0).getTime() -
        new Date(a.modified || 0).getTime();
      const ordered: Session[] = [];
      const visited = new Set<string>();
      const walk = (session: Session, depth: number) => {
        if (session.path && visited.has(session.path)) {
          return;
        }
        if (session.path) {
          visited.add(session.path);
        }
        ordered.push({ ...session, depth });
        const kids = children.get(session.path as string) || [];
        kids.sort(sortByModified).forEach((child) =>
          walk(child, depth + 1),
        );
      };
      roots.sort(sortByModified).forEach((session) => walk(session, 0));
      sessions
        .filter((session) => !session.path || !visited.has(session.path))
        .sort(sortByModified)
        .forEach((session) => ordered.push({ ...session, depth: 0 }));
      node.sessions = ordered;
    } else if (sessions.length === 1) {
      node.sessions = [{ ...sessions[0], depth: 0 }];
    }
    node.children?.forEach(nestSessions);
  };
  for (const project of root.children ?? []) {
    nestSessions(project);
  }

  root.children?.sort((a, b) => {
    const modified = (node: TreeNode) =>
      Math.max(
        0,
        ...(node.sessions ?? []).map((session) =>
          new Date(session.modified || 0).getTime(),
        ),
      );
    const delta = modified(b) - modified(a);
    return delta || a.name.localeCompare(b.name, "zh-CN");
  });
  return root;
}
