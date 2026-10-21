const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
const { spawn } = require("node:child_process");

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
  }

  start() {
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

    const args = [this.cli, "--mode", "rpc", "--session-dir", sessions];
    if (hasSessions && !freshStart) {
      args.push("--continue");
    }

    const env = {
      ...process.env,
      PI_CODING_AGENT_DIR: this.dataDir,
      PI_SKIP_VERSION_CHECK: "1",
      NO_COLOR: "1",
    };

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
      if (!this.disposed) {
        this.onRecord({ type: "bridge_status", status: "exited" });
        if (code !== 0) {
          this.onRecord({
            type: "bridge_log",
            text: `Pi exited with code ${code}${signal ? ` (${signal})` : ""}`,
          });
        }
      }
    });
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

  stop() {
    this.disposed = true;
    if (this.readyTimer) {
      clearTimeout(this.readyTimer);
      this.readyTimer = null;
    }
    const child = this.child;
    this.child = null;
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
