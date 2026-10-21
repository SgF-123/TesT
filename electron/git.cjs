const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFile } = require("node:child_process");

function runGit(cwd, args, timeout = 4000) {
  return new Promise((resolve) => {
    execFile(
      "git",
      ["-c", "safe.directory=*", "-c", "core.quotePath=false", ...args],
      {
        cwd,
        windowsHide: true,
        timeout,
        maxBuffer: 4 * 1024 * 1024,
      },
      (error, stdout) => {
        resolve(error ? null : String(stdout || "").replace(/\s+$/, ""));
      },
    );
  });
}

function cleanPath(value) {
  let text = String(value || "").trim();
  if (text.startsWith('"') && text.endsWith('"')) {
    text = text
      .slice(1, -1)
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }
  return text;
}

async function numstatMap(cwd, cached) {
  const args = cached
    ? ["diff", "--cached", "--numstat"]
    : ["diff", "--numstat"];
  const output = await runGit(cwd, args, 10000);
  const map = new Map();
  if (!output) {
    return map;
  }
  for (const line of output.split(/\r?\n/)) {
    const [add, del, ...rest] = line.split("\t");
    const filePath = rest.join("\t").trim();
    if (!filePath) {
      continue;
    }
    map.set(filePath, {
      additions: Number.parseInt(add, 10) || 0,
      deletions: Number.parseInt(del, 10) || 0,
    });
  }
  return map;
}

async function status(cwd) {
  if (!cwd) {
    return { repo: false, files: [] };
  }
  const output = await runGit(cwd, ["status", "--porcelain=v1"], 8000);
  if (output === null) {
    return { repo: false, files: [] };
  }
  const lines = output ? output.split(/\r?\n/).filter(Boolean) : [];
  const unstagedMap = await numstatMap(cwd, false);
  const stagedMap = await numstatMap(cwd, true);
  const files = [];
  for (const line of lines) {
    const code = line.slice(0, 2);
    let filePath = cleanPath(line.slice(3));
    if (filePath.includes(" -> ")) {
      filePath = cleanPath(filePath.split(" -> ").pop());
    }
    if (!filePath) {
      continue;
    }
    const statusCode = code.includes("?")
      ? "?"
      : code.includes("D")
        ? "D"
        : code.includes("A")
          ? "A"
          : code.includes("R")
            ? "R"
            : "M";
    const unstaged = unstagedMap.get(filePath) || {
      additions: 0,
      deletions: 0,
    };
    const staged = stagedMap.get(filePath) || {
      additions: 0,
      deletions: 0,
    };
    files.push({
      path: filePath,
      status: statusCode,
      staged: code[0] !== " " && code[0] !== "?",
      unstaged: code === "??" || code[1] !== " ",
      additions: unstaged.additions + staged.additions,
      deletions: unstaged.deletions + staged.deletions,
    });
  }
  return { repo: true, files };
}

async function diff(cwd, filePath) {
  if (!cwd || !filePath) {
    return { patch: "", error: "缺少文件路径" };
  }
  let source = "worktree";
  let output = await runGit(cwd, ["diff", "--", filePath], 10000);
  if (!output) {
    output = await runGit(cwd, ["diff", "--cached", "--", filePath], 10000);
    if (output) {
      source = "index";
    }
  }
  if (!output) {
    source = "file";
    try {
      const absolute = path.isAbsolute(filePath)
        ? filePath
        : path.join(cwd, filePath);
      const text = fs.readFileSync(absolute, "utf8");
      output = text
        .split(/\r?\n/)
        .map((line) => `+${line}`)
        .join("\n");
    } catch {
      output = "";
    }
  }
  return {
    patch: output ? output.slice(0, 300000) : "",
    source,
    error: output ? null : "这个文件没有可显示的 diff",
  };
}

async function stage(cwd, filePath) {
  if (!cwd || !filePath) {
    return { error: "缺少文件路径" };
  }
  const result = await runGit(cwd, ["add", "--", filePath], 8000);
  return result === null
    ? { error: `暂存失败：${filePath}` }
    : { ok: true };
}

async function unstage(cwd, filePath) {
  if (!cwd || !filePath) {
    return { error: "缺少文件路径" };
  }
  let result = await runGit(cwd, ["reset", "HEAD", "--", filePath], 8000);
  if (result === null) {
    result = await runGit(cwd, ["rm", "--cached", "--", filePath], 8000);
  }
  return result === null
    ? { error: `取消暂存失败：${filePath}` }
    : { ok: true };
}

async function commit(cwd, message) {
  const value = String(message || "").trim();
  if (!cwd) {
    return { error: "缺少工作区路径" };
  }
  if (!value) {
    return { error: "提交信息不能为空" };
  }
  const result = await runGit(cwd, ["commit", "-m", value], 30000);
  return result === null
    ? { error: "提交失败，请确认已经暂存改动" }
    : { ok: true, output: result.slice(0, 2000) };
}

async function stageHunk(cwd, patch) {
  const value = String(patch || "");
  if (!cwd || !value.trim()) {
    return { error: "缺少 hunk patch" };
  }
  const file = path.join(
    os.tmpdir(),
    `tesT-hunk-${process.pid}-${Date.now()}.patch`,
  );
  try {
    fs.writeFileSync(file, value.endsWith("\n") ? value : `${value}\n`);
    const result = await runGit(
      cwd,
      ["apply", "--cached", "--whitespace=nowarn", file],
      10000,
    );
    return result === null
      ? { error: "这个 hunk 无法暂存，文件可能已被修改" }
      : { ok: true };
  } finally {
    try {
      fs.unlinkSync(file);
    } catch {
      // Ignore temp cleanup failures.
    }
  }
}

async function revertHunk(cwd, patch) {
  const value = String(patch || "");
  if (!cwd || !value.trim()) {
    return { error: "缺少 hunk patch" };
  }
  const file = path.join(
    os.tmpdir(),
    `tesT-revert-${process.pid}-${Date.now()}.patch`,
  );
  try {
    fs.writeFileSync(file, value.endsWith("\n") ? value : `${value}\n`);
    const result = await runGit(
      cwd,
      ["apply", "-R", "--whitespace=nowarn", file],
      10000,
    );
    return result === null
      ? { error: "这个 hunk 无法还原，文件可能已被修改" }
      : { ok: true };
  } finally {
    try {
      fs.unlinkSync(file);
    } catch {
      // Ignore temp cleanup failures.
    }
  }
}

async function revertFile(cwd, filePath) {
  if (!cwd || !filePath) {
    return { error: "缺少文件路径" };
  }
  const statusText = await runGit(
    cwd,
    ["status", "--porcelain=v1", "--", filePath],
    8000,
  );
  if (!statusText) {
    return { error: "这个文件没有待还原的改动" };
  }
  const line = statusText.split(/\r?\n/)[0] || "";
  const code = line.slice(0, 2);
  if (code === "??") {
    const result = await runGit(
      cwd,
      ["clean", "-f", "--", filePath],
      10000,
    );
    return result === null
      ? { error: `无法删除未跟踪文件：${filePath}` }
      : { ok: true };
  }
  const result = await runGit(
    cwd,
    ["restore", "--source=HEAD", "--staged", "--worktree", "--", filePath],
    15000,
  );
  return result === null
    ? { error: `还原失败：${filePath}` }
    : { ok: true };
}

async function info(cwd) {
  if (!cwd) {
    return { repo: false, branch: null, branches: [] };
  }
  const branch = await runGit(cwd, [
    "rev-parse",
    "--abbrev-ref",
    "HEAD",
  ]);
  if (!branch) {
    return { repo: false, branch: null, branches: [] };
  }
  const list = await runGit(cwd, [
    "branch",
    "--format=%(refname:short)",
  ]);
  const branches = list
    ? list.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
    : [];
  if (!branches.includes(branch)) {
    branches.unshift(branch);
  }
  return { repo: true, branch, branches };
}

async function checkout(cwd, branch) {
  const value = String(branch || "").trim();
  if (!cwd || !value) {
    return { error: "缺少工作区或分支名" };
  }
  const result = await runGit(cwd, ["checkout", value]);
  if (result === null) {
    return { error: `切换分支失败：${value}` };
  }
  return { ok: true, branch: value, info: await info(cwd) };
}

async function createBranch(cwd, branch) {
  const value = String(branch || "").trim();
  if (!cwd || !value) {
    return { error: "缺少工作区或分支名" };
  }
  if (!/^[A-Za-z0-9._/-]+$/.test(value)) {
    return { error: "分支名只能包含字母、数字、. _ / -" };
  }
  const result = await runGit(cwd, ["checkout", "-b", value], 15000);
  if (result === null) {
    return { error: `创建分支失败：${value}` };
  }
  return { ok: true, branch: value, info: await info(cwd) };
}

async function deleteBranch(cwd, branch) {
  const value = String(branch || "").trim();
  if (!cwd || !value) {
    return { error: "缺少工作区或分支名" };
  }
  const current = await runGit(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]);
  if (current === value) {
    return { error: "不能删除当前分支，请先切换到其他分支" };
  }
  const result = await runGit(cwd, ["branch", "-D", value], 15000);
  return result === null
    ? { error: `删除分支失败：${value}` }
    : { ok: true, info: await info(cwd) };
}

module.exports = {
  checkout,
  commit,
  createBranch,
  deleteBranch,
  diff,
  info,
  revertFile,
  revertHunk,
  stage,
  stageHunk,
  status,
  unstage,
};
