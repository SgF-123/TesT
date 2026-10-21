const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const paths = require("./paths.cjs");

let current = null;

function psQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function open({ onClosed }) {
  if (current && current.running) {
    return { alreadyOpen: true };
  }

  const cli = paths.piCli();
  if (!fs.existsSync(cli)) {
    return { error: `找不到 Pi CLI：${cli}` };
  }

  const loginDir = path.join(
    os.tmpdir(),
    `tesT-login-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  fs.mkdirSync(loginDir, { recursive: true });
  const pidFile = path.join(loginDir, "pid.txt");
  const script = path.join(loginDir, "login.ps1");
  const node = paths.nodeExe();

  const content = [
    "$Host.UI.RawUI.WindowTitle = 'TesT Pi Login'",
    `$env:PI_CODING_AGENT_DIR = ${psQuote(paths.piDataDir())}`,
    "$env:PI_SKIP_VERSION_CHECK = '1'",
    `Set-Location ${psQuote(path.resolve(__dirname, "..", ".."))}`,
    `$PID | Set-Content -LiteralPath ${psQuote(pidFile)} -Encoding ASCII`,
    `& ${psQuote(node)} ${psQuote(cli)}`,
  ].join("\r\n");
  fs.writeFileSync(script, content, "utf8");

  let launcher;
  try {
    launcher = spawn(
      "cmd.exe",
      [
        "/c",
        "start",
        "",
        "powershell.exe",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        script,
      ],
      {
        cwd: path.resolve(__dirname, "..", ".."),
        detached: true,
        windowsHide: false,
        stdio: "ignore",
      },
    );
  } catch (error) {
    return { error: String(error) };
  }
  launcher.on("error", () => {});

  const state = {
    running: true,
    pid: null,
    timer: null,
  };
  current = state;

  const startInjector = (pid) => {
    const injector = paths.loginInjectScript();
    if (!fs.existsSync(injector)) {
      return;
    }

    const helper = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        injector,
        "-ProcessId",
        String(pid),
      ],
      {
        windowsHide: true,
        stdio: "ignore",
      },
    );
    helper.on("error", () => {});
  };

  const monitor = () => {
    if (!state.running) {
      return;
    }

    try {
      process.kill(state.pid, 0);
      state.timer = setTimeout(monitor, 1000);
    } catch {
      state.running = false;
      current = null;
      fs.rmSync(loginDir, { recursive: true, force: true });
      onClosed?.();
    }
  };

  const waitForPid = () => {
    if (!state.running) {
      return;
    }

    if (fs.existsSync(pidFile)) {
      const pid = Number(fs.readFileSync(pidFile, "utf8").trim());
      if (Number.isInteger(pid) && pid > 0) {
        state.pid = pid;
        startInjector(pid);
        monitor();
        return;
      }
    }

    state.timer = setTimeout(waitForPid, 250);
  };

  waitForPid();
  return { alreadyOpen: false };
}

function stop() {
  if (current?.timer) {
    clearTimeout(current.timer);
  }

  if (current?.pid) {
    try {
      process.kill(current.pid);
    } catch {
      // ignore
    }
  }

  current = null;
}

module.exports = { open, stop };
