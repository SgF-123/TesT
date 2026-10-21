const fs = require("node:fs");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);

function safeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function git(cwd, args) {
  const result = await execFileAsync("git", args, {
    cwd,
    windowsHide: true,
    maxBuffer: 8 * 1024 * 1024,
  });
  return result.stdout.trim();
}

async function list(cwd) {
  if (!cwd || !fs.existsSync(cwd)) {
    return { worktrees: [], error: "工作区不存在" };
  }
  try {
    const output = await git(cwd, ["worktree", "list", "--porcelain"]);
    const worktrees = [];
    let current = null;
    for (const line of output.split(/\r?\n/)) {
      if (line.startsWith("worktree ")) {
        if (current) worktrees.push(current);
        current = {
          path: path.resolve(line.slice(9)),
          branch: "",
          head: "",
        };
      } else if (current && line.startsWith("HEAD ")) {
        current.head = line.slice(5);
      } else if (current && line.startsWith("branch ")) {
        current.branch = line.slice(7).replace(/^refs\/heads\//, "");
      }
    }
    if (current) worktrees.push(current);
    const root = worktrees[0]?.path;
    for (const worktree of worktrees) {
      try {
        const status = await git(worktree.path, [
          "status",
          "--porcelain",
        ]);
        worktree.changes = status
          ? status.split(/\r?\n/).filter(Boolean).length
          : 0;
      } catch {
        worktree.changes = 0;
      }
      if (root && worktree.branch && worktree.path !== root) {
        try {
          const counts = await git(root, [
            "rev-list",
            "--left-right",
            "--count",
            `${worktrees[0].branch || "HEAD"}...${worktree.branch}`,
          ]);
          const [behind, ahead] = counts
            .split(/\s+/)
            .map((value) => Number(value) || 0);
          worktree.ahead = ahead;
          worktree.behind = behind;
        } catch {
          worktree.ahead = 0;
          worktree.behind = 0;
        }
      }
    }
    return { worktrees, error: null };
  } catch (error) {
    return { worktrees: [], error: String(error?.message || error) };
  }
}

async function create(cwd, requestedName) {
  if (!cwd || !fs.existsSync(cwd)) {
    return { error: "工作区不存在" };
  }
  const name =
    safeName(requestedName) ||
    `agent-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}`;
  const branch = `tesT/${name}`;
  const root = path.join(
    path.dirname(cwd),
    `${path.basename(cwd)}-worktrees`,
  );
  const target = path.join(root, name);
  try {
    fs.mkdirSync(root, { recursive: true });
    await git(cwd, ["worktree", "add", "-b", branch, target, "HEAD"]);
    return { ok: true, path: target, branch, name };
  } catch (error) {
    return { error: String(error?.message || error), path: target, branch };
  }
}

async function remove(cwd, target, options = {}) {
  if (!cwd || !target) {
    return { error: "缺少 Worktree 路径" };
  }
  const resolvedCwd = path.resolve(cwd);
  const resolvedTarget = path.resolve(target);
  if (
    resolvedCwd === resolvedTarget ||
    resolvedCwd.startsWith(`${resolvedTarget}${path.sep}`)
  ) {
    return { error: "不能删除当前正在使用的工作区" };
  }
  try {
    const listed = await list(cwd);
    const branch = listed.worktrees?.find(
      (item) => path.resolve(item.path) === resolvedTarget,
    )?.branch;
    await git(cwd, ["worktree", "remove", resolvedTarget]);
    let branchDeleted = false;
    let branchError = null;
    if (options.deleteBranch && branch) {
      try {
        await git(cwd, ["branch", "-d", branch]);
        branchDeleted = true;
      } catch (error) {
        branchError = String(error?.message || error);
      }
    }
    return { ok: true, branch, branchDeleted, branchError };
  } catch (error) {
    return { error: String(error?.message || error) };
  }
}

async function merge(cwd, branch) {
  if (!cwd || !branch) {
    return { error: "缺少分支名称" };
  }
  const listed = await list(cwd);
  const root = listed.worktrees?.[0]?.path;
  if (!root) {
    return { error: "找不到主工作区" };
  }
  try {
    await git(root, ["merge", "--no-edit", branch]);
    return { ok: true, root, branch };
  } catch (error) {
    let conflicts = [];
    try {
      const output = await git(root, [
        "diff",
        "--name-only",
        "--diff-filter=U",
      ]);
      conflicts = output.split(/\r?\n/).filter(Boolean);
    } catch {}
    return {
      error: String(error?.message || error),
      root,
      branch,
      conflicts,
    };
  }
}

async function continueMerge(cwd) {
  const listed = await list(cwd);
  const root = listed.worktrees?.[0]?.path;
  if (!root) {
    return { error: "找不到主工作区" };
  }
  try {
    await git(root, ["merge", "--continue"]);
    return { ok: true, root };
  } catch (error) {
    return { error: String(error?.message || error), root };
  }
}

async function abortMerge(cwd) {
  const listed = await list(cwd);
  const root = listed.worktrees?.[0]?.path;
  if (!root) {
    return { error: "找不到主工作区" };
  }
  try {
    await git(root, ["merge", "--abort"]);
    return { ok: true, root };
  } catch (error) {
    return { error: String(error?.message || error), root };
  }
}

module.exports = {
  list,
  create,
  remove,
  merge,
  abortMerge,
  continueMerge,
};
