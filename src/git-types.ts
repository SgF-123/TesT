export type GitChange = {
  path: string;
  status: string;
  staged?: boolean;
  unstaged?: boolean;
  additions: number;
  deletions: number;
};
