const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
const { spawn } = require("node:child_process");
const paths = require("./paths.cjs");

class NativeLogin {
  constructor({ onMessage, onLog }) {
    this.onMessage = onMessage || (() => {});
    this.onLog = onLog || (() => {});
    this.child = null;
    this.stopping = false;
    this.readyPromise = null;
    this.resolveReady = null;
    this.providers = null;
    this.catalogCache = null;
    this.catalogPromise = null;
    this.resolveCatalog = null;
  }

  ensureStarted() {
    if (this.child && this.child.exitCode === null) {
      return this.readyPromise;
    }

    const helper = path.join(__dirname, "login-helper.cjs");
    if (!fs.existsSync(helper)) {
      return Promise.reject(new Error(`login-helper not found: ${helper}`));
    }

    const bundle = paths.bundleIndex();
    if (!fs.existsSync(bundle)) {
      return Promise.reject(new Error(`Pi bundle not found: ${bundle}`));
    }

    const dataDir = paths.piDataDir();
    const env = {
      ...process.env,
      PI_BUNDLE_INDEX: bundle,
      PI_AGENT_DIR: dataDir,
      PI_MODELS_PATH: paths.modelsPath(),
      PI_AUTH_PATH: paths.authPath(),
      PI_MODELS_STORE_PATH: path.join(dataDir, "models-store.json"),
    };

    const child = spawn(paths.nodeExe(), [helper], {
      cwd: path.resolve(__dirname, "..", ".."),
      env,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.onLog(`spawn pid=${child.pid || "?"}`);
    this.child = child;
    this.stopping = false;
    this.providers = null;
    this.catalogCache = null;
    this.catalogPromise = null;
    this.resolveCatalog = null;

    this.readyPromise = new Promise((resolve) => {
      this.resolveReady = resolve;
    });

    const stdout = readline.createInterface({ input: child.stdout });
    stdout.on("line", (line) => {
      if (!line.trim()) {
        return;
      }

      let message;
      try {
        message = JSON.parse(line);
      } catch {
        this.onLog(line);
        return;
      }

      if (message.type === "ready" && Array.isArray(message.providers)) {
        this.onLog(`ready providers=${message.providers.length}`);
        this.providers = message.providers;
        this.onMessage({ type: "login_providers", providers: message.providers });
        this.resolveReady?.(message.providers);
        this.resolveReady = null;
        return;
      }

      if (message.type === "providers" && Array.isArray(message.providers)) {
        this.providers = message.providers;
        this.onMessage({ type: "login_providers", providers: message.providers });
        this.resolveReady?.(message.providers);
        this.resolveReady = null;
        return;
      }

      if (message.type === "fatal") {
        this.onMessage({ type: "login_error", message: message.message });
        this.resolveReady?.([]);
        this.resolveReady = null;
        return;
      }

      if (message.type === "prompt") {
        this.onMessage({
          type: "login_prompt",
          id: message.id,
          provider: message.provider,
          prompt: message.prompt,
        });
        return;
      }

      if (message.type === "event") {
        this.onMessage({
          type: "login_event",
          provider: message.provider,
          event: message.event,
        });
        return;
      }

      if (message.type === "success") {
        this.catalogCache = null;
        this.onMessage({
          type: "login_success",
          provider: message.provider,
          providers: message.providers,
        });
        return;
      }

      if (message.type === "logout_success") {
        this.catalogCache = null;
        this.onMessage({
          type: "login_logout_success",
          provider: message.provider,
          providers: message.providers,
        });
        return;
      }

      if (message.type === "catalog") {
        this.onLog(
          `catalog:recv models=${Array.isArray(message.models) ? message.models.length : 0}`,
        );
        const result = {
          models: Array.isArray(message.models) ? message.models : [],
          providers: Array.isArray(message.providers)
            ? message.providers
            : [],
          error: message.error || null,
        };
        this.catalogCache = result;
        this.resolveCatalog?.(result);
        this.resolveCatalog = null;
        this.catalogPromise = null;
        return;
      }

      if (message.type === "error" || message.type === "cancelled") {
        this.onMessage({
          type: message.type === "error" ? "login_error" : "login_cancelled",
          provider: message.provider,
          message: message.message,
        });
      }
    });

    const stderr = readline.createInterface({ input: child.stderr });
    stderr.on("line", (line) => {
      if (line.trim()) {
        this.onLog(line);
      }
    });

    child.on("error", (error) => {
      this.onMessage({ type: "login_error", message: String(error) });
      this.resolveReady?.([]);
      this.resolveReady = null;
    });

    child.on("exit", (code, signal) => {
      this.onLog(`exit code=${code} signal=${signal || ""}`);
      this.child = null;
      if (!this.stopping) {
        this.onMessage({ type: "login_helper_closed" });
      }
    });

    return this.readyPromise;
  }

  send(message) {
    if (!this.child || !this.child.stdin.writable) {
      return false;
    }

    try {
      this.child.stdin.write(`${JSON.stringify(message)}\n`);
      return true;
    } catch (error) {
      this.onLog(String(error));
      return false;
    }
  }

  providersList() {
    return this.providers;
  }

  start(provider, mode, apiKey) {
    return this.send({
      type: "login",
      provider,
      mode,
      apiKey,
    });
  }

  respondPrompt(id, value, cancelled = false) {
    return this.send({
      type: "prompt_response",
      id,
      value,
      cancelled,
    });
  }

  cancel() {
    return this.send({ type: "cancel" });
  }

  logout(provider) {
    return this.send({ type: "logout", provider });
  }

  async catalog() {
    if (this.catalogCache) {
      return this.catalogCache;
    }
    if (this.catalogPromise) {
      return this.catalogPromise;
    }

    await this.ensureStarted();
    this.onLog("catalog:send");
    this.catalogPromise = new Promise((resolve) => {
      this.resolveCatalog = resolve;
      if (!this.send({ type: "catalog" })) {
        this.resolveCatalog = null;
        this.catalogPromise = null;
        resolve({ models: [], providers: [], error: "登录进程未就绪" });
      }
    });
    return this.catalogPromise;
  }

  invalidateCatalog() {
    this.catalogCache = null;
  }

  stop() {
    this.stopping = true;
    if (this.child) {
      try {
        this.child.stdin.end();
      } catch {
        // ignore
      }
      try {
        this.child.kill();
      } catch {
        // ignore
      }
    }
    this.child = null;
    this.providers = null;
  }
}

module.exports = { NativeLogin };
