export type Session = {
  title: string;
  meta: string;
  tag?: string;
  unread?: boolean;
  path?: string;
  id?: string;
  cwd?: string;
  messageCount?: number;
  modified?: string;
  parentPath?: string;
  depth?: number;
};

export type SessionTab = {
  path: string;
  title: string;
};

export type SessionInfo = {
  path: string;
  id: string;
  cwd: string;
  parentSessionPath: string | null;
  name: string | null;
  firstMessage: string | null;
  messageCount: number;
  created: string | null;
  modified: string;
};

export type TreeNode = {
  name: string;
  children?: TreeNode[];
  sessions?: Session[];
  fullPath?: string;
};
