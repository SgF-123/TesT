const fs = require("node:fs");
const path = require("node:path");
const pty = require("node-pty");

function shellCommand() {
  const configured = process.env.TEST_SHELL;
  if (configured && fs.existsSync(configured)) {
    return configured;
  }
  if (process.platform === "win32") {
    return process.env.ComSpec || "cmd.exe";
  }
  return process.env.SHELL || "/bin/bash";
}

function shellArgs(shell) {
  const name = path.basename(shell).toLowerCase();
  if (name === "powershell.exe" || name === "pwsh.exe") {
    return ["-NoLogo"];
  }
  return [];
}

function cleanEnv() {
  const env = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string") {
      env[key] = value;
    }
  }
  env.TERM = "xterm-256color";
  env.COLORTERM = "truecolor";
  return env;
}

class PtyTerminalManager {
  constructor(onData) {
    this.onData = onData;
    this.sessions = new Map();
  }

  start(payload = {}) {
    const id = String(payload.id || `terminal-${Date.now()}`);
    const cwd = path.resolve(payload.cwd || process.cwd());
    if (!fs.existsSync(cwd) || !fs.statSync(cwd).isDirectory()) {
      return { error: "终端工作目录不存在" };
    }
    this.stop(id);

    const shell = shellCommand();
    const proc = pty.spawn(shell, shellArgs(shell), {
      name: "xterm-256color",
      cols: Math.max(20, Number(payload.cols) || 100),
      rows: Math.max(5, Number(payload.rows) || 30),
      cwd,
      env: cleanEnv(),
      useConpty: process.platform === "win32",
    });

    proc.onData((data) => {
      this.onData({ id, type: "data", data });
    });
    proc.onExit(({ exitCode, signal }) => {
      if (this.sessions.get(id)?.proc === proc) {
        this.sessions.delete(id);
      }
      this.onData({
        id,
        type: "exit",
        code: exitCode,
        signal: signal || null,
      });
    });

    this.sessions.set(id, { proc, cwd });
    return { ok: true, id, pid: proc.pid, shell };
  }

  write(payload = {}) {
    const session = this.sessions.get(String(payload.id || ""));
    if (!session) {
      return { error: "终端尚未启动" };
    }
    const data = String(payload.data ?? payload.command ?? "");
    if (data) {
      session.proc.write(data);
    }
    return { ok: true };
  }

  resize(payload = {}) {
    const session = this.sessions.get(String(payload.id || ""));
    if (!session) {
      return { error: "终端尚未启动" };
    }
    session.proc.resize(
      Math.max(20, Number(payload.cols) || 100),
      Math.max(5, Number(payload.rows) || 30),
    );
    return { ok: true };
  }

  stop(id) {
    if (id) {
      const session = this.sessions.get(String(id));
      if (!session) {
        return { ok: true };
      }
      this.sessions.delete(String(id));
      try {
        session.proc.kill();
      } catch {
        // ignore
      }
      return { ok: true };
    }
    for (const session of this.sessions.values()) {
      try {
        session.proc.kill();
      } catch {
        // ignore
      }
    }
    this.sessions.clear();
    return { ok: true };
  }

  dispose() {
    this.stop();
  }
}

module.exports = { PtyTerminalManager };
