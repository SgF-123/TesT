const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
const { spawn } = require("node:child_process");
const { prepareShellRuntime } = require("./shell-runtime.cjs");

class PiBridge {
  constructor(options) {
    this.cli = options.cli;
    this.cwd = options.cwd;
    this.dataDir = options.dataDir;
    this.node = options.node;
    this.onRecord = options.onRecord || (() => {});

    this.child = null;
    this.disposed = false;
    this.announcedReady = false;
    this.fresh = false;
    this.readyTimer = null;
    this.restartTimer = null;
    this.restartAttempts = 0;
    this.startedAt = 0;
    this.readyWaiters = new Set();
    this.responseWaiters = new Map();
  }

  start() {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    if (!fs.existsSync(this.cli)) {
      this.onRecord({ type: "bridge_status", status: "error" });
      this.onRecord({
        type: "bridge_log",
        text: `Pi CLI not found: ${this.cli}`,
      });
      return;
    }

    const sessions = path.join(this.dataDir, "sessions");
    fs.mkdirSync(sessions, { recursive: true });
    const hasSessions =
      fs.existsSync(sessions) &&
      fs.readdirSync(sessions).some((name) => name.endsWith(".jsonl"));
    const freshStart = this.fresh === true;
    this.fresh = false;

    const shellRuntime = prepareShellRuntime(process.env);
    const args = [this.cli, "--mode", "rpc", "--session-dir", sessions];
    args.push(...shellRuntime.toolArgs);
    if (hasSessions && !freshStart) {
      args.push("--continue");
    }

    const env = {
      ...shellRuntime.env,
      PI_CODING_AGENT_DIR: this.dataDir,
      PI_SKIP_VERSION_CHECK: "1",
      NO_COLOR: "1",
    };
    const vendorPath = path.resolve(this.cli, "..", "..", "vendor");
    env.NODE_PATH = [vendorPath, process.env.NODE_PATH]
      .filter(Boolean)
      .join(path.delimiter);

    this.onRecord({
      type: "bridge_log",
      text: shellRuntime.bashPath
        ? `shell: Git Bash (${shellRuntime.bashPath})`
        : "shell: PowerShell fallback (Git Bash not found)",
    });

    let child;
    try {
      child = spawn(this.node, args, {
        cwd: this.cwd,
        env,
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (error) {
      this.onRecord({ type: "bridge_status", status: "error" });
      this.onRecord({ type: "bridge_log", text: String(error) });
      return;
    }

    this.child = child;
    this.startedAt = Date.now();
    this.announcedReady = false;
    this.onRecord({ type: "bridge_status", status: "starting" });

    const announceReady = () => {
      if (this.announcedReady) {
        return;
      }
      this.announcedReady = true;
      if (this.readyTimer) {
        clearTimeout(this.readyTimer);
        this.readyTimer = null;
      }
      this.onRecord({ type: "bridge_status", status: "ready" });
      for (const waiter of this.readyWaiters) {
        clearTimeout(waiter.timer);
        this.send(waiter.command);
        waiter.resolve(true);
      }
      this.readyWaiters.clear();
      if (freshStart) {
        this.send({
          id: `workspace-session-${Date.now()}`,
          type: "new_session",
        });
      }
    };

    // RPC mode can stay silent until the first command is written, so don't
    // depend on stdout to decide when the sidecar is ready.
    this.readyTimer = setTimeout(announceReady, 700);

    const stdout = readline.createInterface({ input: child.stdout });
    stdout.on("line", (line) => {
      if (!line.trim()) {
        return;
      }

      if (!this.announcedReady) {
        announceReady();
      }

      let record;
      try {
        record = JSON.parse(line);
      } catch {
        this.onRecord({ type: "bridge_log", text: line });
        return;
      }

      if (record?.type === "response" && record.id) {
        const waiter = this.responseWaiters.get(record.id);
        if (waiter) {
          clearTimeout(waiter.timer);
          this.responseWaiters.delete(record.id);
          waiter.resolve(record);
        }
      }
      this.onRecord(record);
    });

    const stderr = readline.createInterface({ input: child.stderr });
    stderr.on("line", (line) => {
      if (line.trim()) {
        this.onRecord({ type: "bridge_log", text: line });
      }
    });

    child.on("error", (error) => {
      if (this.readyTimer) {
        clearTimeout(this.readyTimer);
        this.readyTimer = null;
      }
      this.onRecord({ type: "bridge_status", status: "error" });
      this.onRecord({ type: "bridge_log", text: String(error) });
    });

    child.on("exit", (code, signal) => {
      if (this.readyTimer) {
        clearTimeout(this.readyTimer);
        this.readyTimer = null;
      }
      if (this.child === child) {
        this.child = null;
      }
      this.rejectResponseWaiters();
      if (!this.disposed) {
        this.onRecord({ type: "bridge_status", status: "exited" });
        if (code !== 0) {
          this.onRecord({
            type: "bridge_log",
            text: `Pi exited with code ${code}${signal ? ` (${signal})` : ""}`,
          });
        }
        this.scheduleRestart();
      }
    });
  }

  scheduleRestart() {
    if (this.disposed || this.restartTimer || this.child) {
      return;
    }
    const stableFor = this.startedAt ? Date.now() - this.startedAt : 0;
    if (stableFor >= 30_000) {
      this.restartAttempts = 0;
    }
    const delays = [500, 1_500, 3_000, 6_000, 12_000];
    const delay =
      delays[Math.min(this.restartAttempts, delays.length - 1)];
    this.restartAttempts += 1;
    this.onRecord({
      type: "bridge_status",
      status: "restarting",
      delayMs: delay,
      attempt: this.restartAttempts,
    });
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null;
      if (!this.disposed && !this.child) {
        this.start();
      }
    }, delay);
  }

  send(command) {
    if (!this.child || !this.child.stdin.writable) {
      return;
    }

    try {
      this.child.stdin.write(`${JSON.stringify(command)}\n`);
    } catch (error) {
      this.onRecord({ type: "bridge_log", text: String(error) });
    }
  }

  sendWhenReady(command, timeoutMs = 8000) {
    if (
      this.child &&
      this.child.stdin.writable &&
      this.announcedReady
    ) {
      this.send(command);
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      const waiter = {
        command,
        resolve,
        timer: setTimeout(() => {
          this.readyWaiters.delete(waiter);
          resolve(false);
        }, timeoutMs),
      };
      this.readyWaiters.add(waiter);
    });
  }

  waitForResponse(id, timeoutMs = 10000) {
    return new Promise((resolve) => {
      const waiter = {
        resolve,
        timer: setTimeout(() => {
          this.responseWaiters.delete(id);
          resolve(null);
        }, timeoutMs),
      };
      this.responseWaiters.set(id, waiter);
    });
  }

  rejectResponseWaiters() {
    for (const waiter of this.responseWaiters.values()) {
      clearTimeout(waiter.timer);
      waiter.resolve(null);
    }
    this.responseWaiters.clear();
  }

  stop() {
    this.disposed = true;
    if (this.readyTimer) {
      clearTimeout(this.readyTimer);
      this.readyTimer = null;
    }
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    const child = this.child;
    this.child = null;
    this.rejectResponseWaiters();
    if (!child) {
      return;
    }

    try {
      child.stdin.end();
    } catch {
      // ignore
    }

    try {
      if (!child.killed) {
        child.kill();
      }
    } catch {
      // ignore
    }
  }

  restart() {
    this.fresh = false;
    this.stop();
    this.disposed = false;
    setTimeout(() => {
      if (!this.disposed) {
        this.start();
      }
    }, 300);
  }

  setCwd(cwd, options = {}) {
    this.cwd = cwd;
    this.fresh = options.fresh !== false;
    this.stop();
    this.disposed = false;
    setTimeout(() => {
      if (!this.disposed) {
        this.start();
      }
    }, 300);
  }
}

module.exports = { PiBridge };
