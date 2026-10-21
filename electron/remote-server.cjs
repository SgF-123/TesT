const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const qrcode = require("qrcode-generator");

const DEFAULT_PORT = 47821;
const ALLOWED_COMMANDS = new Set([
  "prompt",
  "steer",
  "follow_up",
  "abort",
  "new_session",
  "set_model",
  "get_state",
  "get_messages",
  "get_available_models",
  "get_session_stats",
  "set_thinking_level",
  "switch_session",
  "compact",
]);

function randomToken() {
  return crypto.randomBytes(24).toString("hex");
}

function lanAddresses() {
  const rows = [];
  for (const [name, entries] of Object.entries(os.networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.family === "IPv4" && !entry.internal) {
        const octets = entry.address.split(".").map(Number);
        const tailscale =
          octets[0] === 100 &&
          octets[1] >= 64 &&
          octets[1] <= 127;
        rows.push({
          name,
          address: entry.address,
          kind: tailscale ? "tailscale" : "lan",
        });
      }
    }
  }
  const score = (address) => {
    const octets = address.split(".").map(Number);
    if (
      octets[0] === 100 &&
      octets[1] >= 64 &&
      octets[1] <= 127
    ) {
      return -1;
    }
    if (address.startsWith("192.168.")) return 0;
    if (address.startsWith("10.")) return 1;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(address)) return 2;
    return 3;
  };
  return rows.sort(
    (left, right) =>
      score(left.address) - score(right.address) ||
      left.name.localeCompare(right.name),
  );
}

function qrSvg(data) {
  try {
    const qr = qrcode(0, "M");
    qr.addData(data);
    qr.make();
    return qr.createSvgTag({
      cellSize: 4,
      margin: 2,
      scalable: true,
    });
  } catch {
    return "";
  }
}

class RemoteServer {
  constructor(options = {}) {
    this.onCommand = options.onCommand || (() => {});
    this.onStatus = options.onStatus || (() => {});
    this.onLog = options.onLog || (() => {});
    this.onClientConnect = options.onClientConnect || (() => {});
    this.onClientChange = options.onClientChange || (() => {});
    this.getWorkspace = options.getWorkspace || (() => "");
    this.getSessions = options.getSessions || (() => []);
    this.server = null;
    this.token = "";
    this.port = DEFAULT_PORT;
    this.clients = new Set();
    this.startedAt = null;
    this.lastError = "";
    this.mobileHtml = "";
    this.tunnelProcess = null;
    this.publicBaseUrl = "";
    this.tunnelState = "off";
    this.tunnelError = "";
    this.tunnelMessage = "";
    this.tunnelPercent = 0;
  }

  mobileFile() {
    return path.join(__dirname, "..", "mobile", "index.html");
  }

  readMobile() {
    try {
      return fs.readFileSync(this.mobileFile(), "utf8");
    } catch (error) {
      this.onLog(`remote:mobile-read-error ${error}`);
      return `<!doctype html><meta charset="utf-8"><title>TesT Remote</title>
        <body style="font-family:system-ui;padding:24px">TesT 远程页面缺失，请重新构建应用。</body>`;
    }
  }

  urls() {
    if (!this.token) {
      return [];
    }
    const rows = lanAddresses().map((entry) => ({
      ...entry,
      url: `http://${entry.address}:${this.port}/?token=${this.token}`,
    }));
    return rows.length
      ? rows
      : [
          {
            name: "loopback",
            address: "127.0.0.1",
            url: `http://127.0.0.1:${this.port}/?token=${this.token}`,
          },
        ];
  }

  status() {
    const urls = this.urls();
    const lanPrimary = urls[0] || null;
    const publicUrl = this.publicBaseUrl
      ? `${this.publicBaseUrl}/?token=${this.token}`
      : "";
    const primary = publicUrl
      ? { url: publicUrl, address: "public", name: "公网" }
      : lanPrimary;
    return {
      running: Boolean(this.server),
      port: this.port,
      token: this.token,
      url: primary?.url || "",
      urls,
      qrSvg: primary ? qrSvg(primary.url) : "",
      publicUrl,
      publicBaseUrl: this.publicBaseUrl,
      tailscaleUrl:
        urls.find((entry) => entry.kind === "tailscale")?.url || "",
      tunnelState: this.tunnelState,
      tunnelError: this.tunnelError,
      tunnelMessage: this.tunnelMessage,
      tunnelPercent: this.tunnelPercent,
      clients: this.clients.size,
      startedAt: this.startedAt,
      workspace: this.getWorkspace(),
      localOnly:
        !publicUrl &&
        urls.length === 1 &&
        urls[0]?.address === "127.0.0.1",
      error: this.lastError,
    };
  }

  emitStatus() {
    this.onStatus(this.status());
  }

  async startTunnel() {
    if (this.tunnelProcess) {
      return this.status();
    }
    if (!this.server) {
      await this.start();
    }
    this.tunnelState = "starting";
    this.tunnelMessage = "正在建立 SSH 公网隧道…";
    this.tunnelPercent = 0;
    this.tunnelError = "";
    this.emitStatus();

    const systemRoot = process.env.SystemRoot || "C:\\Windows";
    const installedSsh = path.join(
      systemRoot,
      "System32",
      "OpenSSH",
      "ssh.exe",
    );
    const executable = fs.existsSync(installedSsh)
      ? installedSsh
      : "ssh.exe";
    const child = spawn(
      executable,
      [
        "-tt",
        "-o",
        "StrictHostKeyChecking=no",
        "-o",
        "UserKnownHostsFile=NUL",
        "-o",
        "ServerAliveInterval=20",
        "-o",
        "ServerAliveCountMax=3",
        "-o",
        "ExitOnForwardFailure=yes",
        "-o",
        "ConnectTimeout=20",
        "-R",
        `80:127.0.0.1:${this.port}`,
        "serveo.net",
      ],
      {
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    this.tunnelProcess = child;
    this.onLog(`remote:tunnel-start pid=${child.pid || "?"}`);

    let buffer = "";
    const onData = (chunk) => {
      buffer += chunk.toString();
      if (buffer.length > 24000) {
        buffer = buffer.slice(-24000);
      }
      const explicit = buffer.match(
        /Forwarding HTTP traffic from\s+(https:\/\/[a-z0-9.-]+)/i,
      );
      const fallback = buffer.match(
        /https:\/\/[a-z0-9-]+\.(?:serveousercontent\.com|serveo\.net)/i,
      );
      const url = explicit?.[1] || fallback?.[0];
      if (url && !this.publicBaseUrl) {
        this.publicBaseUrl = url;
        this.tunnelState = "running";
        this.tunnelMessage = "SSH 公网隧道已建立";
        this.tunnelError = "";
        this.onLog(`remote:tunnel-url ${url}`);
        this.emitStatus();
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("error", (error) => {
      this.tunnelProcess = null;
      this.publicBaseUrl = "";
      this.tunnelState = "error";
      this.tunnelError = String(error?.message || error);
      this.tunnelMessage = "SSH 公网隧道启动失败";
      this.emitStatus();
    });
    child.on("exit", (code, signal) => {
      this.tunnelProcess = null;
      this.publicBaseUrl = "";
      if (this.tunnelState === "running" || this.tunnelState === "starting") {
        this.tunnelState = "stopped";
        this.tunnelMessage = "SSH 公网隧道已关闭";
      }
      this.onLog(
        `remote:tunnel-exit code=${code} signal=${signal || ""} output=${buffer.slice(-1200)}`,
      );
      this.emitStatus();
    });

    try {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("SSH 公网隧道启动超时")),
          35000,
        );
        const check = setInterval(() => {
          if (this.publicBaseUrl) {
            clearInterval(check);
            clearTimeout(timer);
            resolve();
          } else if (this.tunnelState === "error") {
            clearInterval(check);
            clearTimeout(timer);
            reject(new Error(this.tunnelError || "SSH 公网隧道启动失败"));
          }
        }, 250);
      });
    } catch (error) {
      this.stopTunnel();
      this.tunnelState = "error";
      this.tunnelError = String(error?.message || error);
      this.tunnelMessage = "公网隧道启动失败";
      this.emitStatus();
      throw error;
    }
    return this.status();
  }

  stopTunnel() {
    const child = this.tunnelProcess;
    this.tunnelProcess = null;
    this.publicBaseUrl = "";
    this.tunnelState = "off";
    this.tunnelMessage = "";
    this.tunnelError = "";
    this.tunnelPercent = 0;
    if (child) {
      try {
        child.kill();
      } catch {
        // ignore
      }
    }
    this.emitStatus();
    return this.status();
  }

  tokenFrom(request, url) {
    const header = String(request.headers.authorization || "");
    if (header.startsWith("Bearer ")) {
      return header.slice(7).trim();
    }
    return url.searchParams.get("token") || "";
  }

  authorized(request, url) {
    return Boolean(this.token) && this.tokenFrom(request, url) === this.token;
  }

  async start() {
    if (this.server) {
      return this.status();
    }
    this.mobileHtml = this.readMobile();
    this.token = randomToken();
    this.lastError = "";
    const server = http.createServer((request, response) =>
      this.handle(request, response),
    );

    let listeningPort = 0;
    for (let port = DEFAULT_PORT; port < DEFAULT_PORT + 24; port += 1) {
      try {
        await new Promise((resolve, reject) => {
          const onError = (error) => {
            server.off("listening", onListening);
            reject(error);
          };
          const onListening = () => {
            server.off("error", onError);
            resolve();
          };
          server.once("error", onError);
          server.once("listening", onListening);
          server.listen(port, "0.0.0.0");
        });
        listeningPort = port;
        break;
      } catch (error) {
        if (error?.code !== "EADDRINUSE") {
          this.lastError = String(error?.message || error);
          this.onLog(`remote:start-error ${this.lastError}`);
          throw error;
        }
      }
    }

    if (!listeningPort) {
      this.lastError = "没有可用端口";
      throw new Error(this.lastError);
    }

    this.server = server;
    this.port = listeningPort;
    this.startedAt = new Date().toISOString();
    server.on("error", (error) => {
      this.lastError = String(error?.message || error);
      this.onLog(`remote:server-error ${this.lastError}`);
      this.emitStatus();
    });
    this.onLog(`remote:started http://0.0.0.0:${this.port}`);
    this.emitStatus();
    return this.status();
  }

  stop() {
    this.stopTunnel();
    const server = this.server;
    this.server = null;
    this.token = "";
    this.startedAt = null;
    for (const client of this.clients) {
      try {
        client.response.end();
      } catch {
        // ignore
      }
    }
    this.clients.clear();
    if (server) {
      try {
        server.close();
      } catch {
        // ignore
      }
    }
    this.onClientChange(0);
    this.onLog("remote:stopped");
    this.emitStatus();
    return this.status();
  }

  refreshToken() {
    this.token = randomToken();
    for (const client of this.clients) {
      try {
        client.response.end();
      } catch {
        // ignore
      }
    }
    this.clients.clear();
    this.onClientChange(0);
    this.emitStatus();
    return this.status();
  }

  handle(request, response) {
    const url = new URL(
      request.url || "/",
      `http://${request.headers.host || "localhost"}`,
    );
    const headers = {
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Cache-Control": "no-store",
    };

    if (url.pathname === "/favicon.ico") {
      response.writeHead(204, headers);
      response.end();
      return;
    }

    if (url.pathname === "/api/status") {
      if (!this.authorized(request, url)) {
        this.unauthorized(response, headers);
        return;
      }
      this.json(response, this.status(), headers);
      return;
    }

    if (url.pathname === "/api/sessions") {
      if (!this.authorized(request, url)) {
        this.unauthorized(response, headers);
        return;
      }
      Promise.resolve(this.getSessions())
        .then((sessions) => {
          this.json(
            response,
            { sessions: Array.isArray(sessions) ? sessions : [] },
            headers,
          );
        })
        .catch((error) => {
          this.onLog(`remote:sessions-error ${error}`);
          this.json(
            response,
            { error: String(error?.message || error) },
            headers,
            500,
          );
        });
      return;
    }

    if (url.pathname === "/manifest.webmanifest") {
      const token = url.searchParams.get("token") || "";
      this.json(
        response,
        {
          name: "TesT Remote",
          short_name: "TesT",
          description: "在手机上指挥电脑上的 Pi 干活",
          start_url: token ? `/?token=${encodeURIComponent(token)}` : "/",
          scope: "/",
          display: "standalone",
          orientation: "portrait",
          background_color: "#eeeeeb",
          theme_color: "#1f9d74",
          icons: [
            {
              src: "/icon.svg",
              sizes: "any",
              type: "image/svg+xml",
              purpose: "any",
            },
          ],
        },
        {
          ...headers,
          "Content-Type": "application/manifest+json; charset=utf-8",
          "Cache-Control": "public, max-age=300",
        },
      );
      return;
    }

    if (url.pathname === "/icon.svg") {
      response.writeHead(200, {
        ...headers,
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400",
      });
      response.end(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="46" fill="#0a0a0a"/><path d="M50 50h92v24h-33v70H83V74H50z" fill="#ffffff"/><circle cx="135" cy="135" r="17" fill="#3ddc97"/></svg>',
      );
      return;
    }

    if (url.pathname === "/api/events") {
      this.events(request, response, url, headers);
      return;
    }

    if (url.pathname === "/api/command") {
      this.command(request, response, url, headers);
      return;
    }

    if (url.pathname === "/" || url.pathname === "/index.html") {
      if (!this.authorized(request, url)) {
        response.writeHead(401, {
          ...headers,
          "Content-Type": "text/html; charset=utf-8",
        });
        response.end(
          "<!doctype html><meta charset='utf-8'><body style='font-family:system-ui;padding:24px'>TesT 远程访问令牌无效，请重新扫描桌面端二维码。</body>",
        );
        return;
      }
      response.writeHead(200, {
        ...headers,
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy":
          "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:;",
      });
      response.end(this.mobileHtml || this.readMobile());
      return;
    }

    response.writeHead(404, headers);
    response.end("Not found");
  }

  unauthorized(response, headers) {
    this.json(response, { error: "unauthorized" }, headers, 401);
  }

  json(response, data, headers, statusCode = 200) {
    response.writeHead(statusCode, {
      ...headers,
      "Content-Type":
        headers["Content-Type"] || "application/json; charset=utf-8",
    });
    response.end(JSON.stringify(data));
  }

  events(request, response, url, headers) {
    if (!this.authorized(request, url)) {
      this.unauthorized(response, headers);
      return;
    }
    response.writeHead(200, {
      ...headers,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    const client = {
      response,
      id: crypto.randomUUID(),
    };
    this.clients.add(client);
    this.onClientChange(this.clients.size);
    response.write(
      `event: hello\ndata: ${JSON.stringify({
        type: "remote_hello",
        workspace: this.getWorkspace(),
        status: {
          running: true,
          port: this.port,
          clients: this.clients.size,
        },
      })}\n\n`,
    );
    try {
      this.onClientConnect();
    } catch (error) {
      this.onLog(`remote:client-connect-error ${error}`);
    }
    const ping = setInterval(() => {
      try {
        response.write(": ping\n\n");
      } catch {
        // ignore
      }
    }, 15000);
    request.on("close", () => {
      clearInterval(ping);
      this.clients.delete(client);
      this.onClientChange(this.clients.size);
    });
  }

  command(request, response, url, headers) {
    if (!this.authorized(request, url)) {
      this.unauthorized(response, headers);
      return;
    }
    if (request.method !== "POST") {
      this.json(response, { error: "method not allowed" }, headers, 405);
      return;
    }
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        request.destroy();
      }
    });
    request.on("end", () => {
      let command;
      try {
        command = JSON.parse(body || "{}");
      } catch {
        this.json(response, { error: "invalid json" }, headers, 400);
        return;
      }
      if (!command || !ALLOWED_COMMANDS.has(command.type)) {
        this.json(response, { error: "unsupported command" }, headers, 400);
        return;
      }
      const id =
        typeof command.id === "string" && command.id
          ? command.id
          : `web-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
      try {
        this.onCommand({ ...command, id });
        this.json(response, { ok: true, id }, headers);
      } catch (error) {
        this.json(
          response,
          { error: String(error?.message || error) },
          headers,
          500,
        );
      }
    });
  }

  broadcast(record) {
    if (!this.clients.size) {
      return;
    }
    let data;
    try {
      data = JSON.stringify(record);
    } catch {
      return;
    }
    if (data.length > 2_000_000) {
      data = JSON.stringify({
        type: "remote_truncated",
        message: "记录过大，手机端已省略",
      });
    }
    const frame = `data: ${data}\n\n`;
    for (const client of [...this.clients]) {
      try {
        client.response.write(frame);
      } catch {
        this.clients.delete(client);
      }
    }
  }
}

module.exports = { RemoteServer };
