const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
const { pathToFileURL } = require("node:url");

const bundle = process.env.PI_BUNDLE_INDEX;
const agentDir = process.env.PI_AGENT_DIR;
const modelsPath = process.env.PI_MODELS_PATH;
const authPath = process.env.PI_AUTH_PATH;
const modelsStorePath = process.env.PI_MODELS_STORE_PATH;

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function getDeviceId() {
  const file = path.join(agentDir, "device-id");
  try {
    const existing = fs.readFileSync(file, "utf8").trim();
    if (existing) {
      return existing;
    }
  } catch {
    // create below
  }

  const id = crypto.randomUUID();
  fs.mkdirSync(agentDir, { recursive: true });
  fs.writeFileSync(file, id, "utf8");
  return id;
}

async function main() {
  if (!bundle || !fs.existsSync(bundle)) {
    send({ type: "fatal", message: `Pi bundle not found: ${bundle}` });
    process.exit(1);
  }

  const module = await import(pathToFileURL(bundle).href);
  const ModelRuntime = module.ModelRuntime;
  if (!ModelRuntime) {
    send({ type: "fatal", message: "ModelRuntime export not found" });
    process.exit(1);
  }

  fs.mkdirSync(agentDir, { recursive: true });
  const runtime = await ModelRuntime.create({
    modelsPath,
    authPath,
    modelsStorePath,
    refreshOnCreate: false,
  });
  // Populate credential / provider availability without hitting the network.
  // Without this, getProviderAuthStatus() always reports "not configured"
  // and the full model catalog shows every model as locked.
  await runtime.refresh({ allowNetwork: false }).catch(() => {});

  async function providers() {
    const credentials = await runtime.listCredentials();
    const seen = new Set();
    const result = [];

    for (const provider of runtime.getProviders()) {
      if (seen.has(provider.id)) {
        continue;
      }
      seen.add(provider.id);

      const oauth = provider.auth?.oauth;
      const apiKey = provider.auth?.apiKey;
      if (!oauth && !apiKey?.login) {
        continue;
      }

      const credential = credentials.find(
        (entry) => entry.providerId === provider.id,
      );
      const status = runtime.getProviderAuthStatus(provider.id);
      result.push({
        id: provider.id,
        name:
          provider.id === "openai-codex"
            ? "ChatGPT Plus/Pro"
            : provider.id === "github-copilot"
              ? "GitHub Copilot"
              : oauth?.name || provider.name,
        hasOAuth: Boolean(oauth),
        oauthName: oauth?.name ?? null,
        hasApiKey: Boolean(apiKey?.login),
        configured: status.configured,
        source: status.source ?? null,
        credentialType: credential?.type ?? null,
        modelCount: runtime.getModels(provider.id).length,
      });
    }

    result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }

  let busy = false;
  let cancelController = null;
  const pendingPrompts = new Map();

  function requestPrompt(provider, prompt) {
    const id = crypto.randomUUID();
    send({
      type: "prompt",
      id,
      provider,
      prompt,
    });

    return new Promise((resolve, reject) => {
      pendingPrompts.set(id, { resolve, reject });
    });
  }

  async function login(message) {
    if (busy) {
      send({ type: "error", provider: message.provider, message: "已有登录正在进行" });
      return;
    }

    const provider = runtime.getProvider(message.provider);
    if (!provider) {
      send({ type: "error", provider: message.provider, message: "未知服务商" });
      return;
    }

    const mode = message.mode === "api_key" ? "api_key" : "oauth";
    if (mode === "oauth" && !provider.auth.oauth) {
      send({ type: "error", provider: message.provider, message: "该服务商不支持 OAuth" });
      return;
    }
    if (mode === "api_key" && !provider.auth.apiKey?.login) {
      send({ type: "error", provider: message.provider, message: "该服务商不支持 API Key 登录" });
      return;
    }

    busy = true;
    cancelController = new AbortController();
    const apiKey = String(message.apiKey || "").trim();
    let keySubmitted = false;

    try {
      await runtime.login(
        message.provider,
        mode,
        {
          signal: cancelController.signal,
          notify: (event) => {
            send({ type: "event", provider: message.provider, event });
          },
          prompt: async (prompt) => {
            if (mode === "api_key") {
              if (prompt.type === "select") {
                const option = prompt.options.find(
                  (item) =>
                    item.id === "api-key" || item.id === "bearer-token",
                );
                if (option) {
                  return option.id;
                }
              }

              if (!keySubmitted && prompt.type === "secret") {
                keySubmitted = true;
                return apiKey;
              }
            }

            return requestPrompt(message.provider, prompt);
          },
        },
        { getDeviceId },
      );

      send({ type: "success", provider: message.provider, providers: await providers() });
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      send({
        type: text === "Login cancelled" ? "cancelled" : "error",
        provider: message.provider,
        message: text,
      });
    } finally {
      busy = false;
      cancelController = null;
    }
  }

  async function logout(provider) {
    try {
      await runtime.logout(provider);
      send({
        type: "logout_success",
        provider,
        providers: await providers(),
      });
    } catch (error) {
      send({
        type: "error",
        provider,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function catalog() {
    // Pick up models.json / models-store.json changes without restarting
    // the helper, then rebuild the availability snapshot.
    await runtime.refresh({ allowNetwork: false }).catch(() => {});
    const models = [];
    const providerList = [];

    for (const provider of runtime.getProviders()) {
      const list = runtime.getModels(provider.id);
      if (list.length === 0) {
        continue;
      }
      const status = runtime.getProviderAuthStatus(provider.id);
      providerList.push({
        id: provider.id,
        name: provider.name,
        available: status.configured,
        modelCount: list.length,
      });

      for (const model of list) {
        models.push({
          id: model.id,
          name: model.name || model.id,
          provider: provider.id,
          providerName: provider.name,
          contextWindow: model.contextWindow || null,
          reasoning: Boolean(model.reasoning),
          available: status.configured,
        });
      }
    }

    providerList.sort((a, b) => a.name.localeCompare(b.name));
    models.sort(
      (a, b) =>
        a.provider.localeCompare(b.provider) ||
        a.name.localeCompare(b.name),
    );
    return { models, providers: providerList };
  }

  send({ type: "ready", providers: await providers() });

  const input = readline.createInterface({ input: process.stdin });
  input.on("line", (line) => {
    if (!line.trim()) {
      return;
    }

    let message;
    try {
      message = JSON.parse(line);
    } catch {
      return;
    }

    if (message.type === "login") {
      void login(message);
      return;
    }

    if (message.type === "logout") {
      void logout(message.provider);
      return;
    }

    if (message.type === "catalog") {
      void catalog()
        .then((result) => send({ type: "catalog", ...result }))
        .catch((error) =>
          send({
            type: "catalog",
            models: [],
            providers: [],
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      return;
    }

    if (message.type === "prompt_response") {
      const pending = pendingPrompts.get(message.id);
      if (pending) {
        pendingPrompts.delete(message.id);
        if (message.cancelled) {
          pending.reject(new Error("Login cancelled"));
        } else {
          pending.resolve(String(message.value ?? ""));
        }
      }
      return;
    }

    if (message.type === "cancel") {
      cancelController?.abort();
      for (const pending of pendingPrompts.values()) {
        pending.reject(new Error("Login cancelled"));
      }
      pendingPrompts.clear();
      return;
    }

    if (message.type === "providers") {
      void providers().then((list) => send({ type: "providers", providers: list }));
      return;
    }

    if (message.type === "quit") {
      process.exit(0);
    }
  });
}

main().catch((error) => {
  send({
    type: "fatal",
    message: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
