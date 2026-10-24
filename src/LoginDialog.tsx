import { useEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Globe,
  KeyRound,
  Link2,
  LogIn,
  LogOut,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "./Button";
import { copyText } from "./clipboard";
import { LoadingRing } from "./Loading";
import { Tag } from "./Tag";

type LoginProvider = {
  id: string;
  name: string;
  hasOAuth: boolean;
  oauthName?: string | null;
  hasApiKey: boolean;
  configured: boolean;
  source?: string | null;
  credentialType?: string | null;
  modelCount: number;
};

type LoginPromptState = {
  id: string;
  provider: string;
  prompt: {
    type: string;
    message?: string;
    placeholder?: string;
    options?: { id: string; label: string; description?: string }[];
  };
};

function LoginDialog({
  open,
  onOpenChange,
  onNotify,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNotify: (title: string, desc?: string) => void;
  onSuccess: () => void;
}) {
  const bridge = window.tesT;
  const [providers, setProviders] = useState<LoginProvider[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "oauth" | "api">("all");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<LoginProvider | null>(null);
  const [mode, setMode] = useState<"oauth" | "api_key">("oauth");
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState("");
  const [event, setEvent] = useState<any>(null);
  const [prompt, setPrompt] = useState<LoginPromptState | null>(null);
  const [promptValue, setPromptValue] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const openedUrl = useRef("");
  const providerListRef = useRef<HTMLDivElement>(null);
  const notifyRef = useRef(onNotify);
  notifyRef.current = onNotify;
  const openChangeRef = useRef(onOpenChange);
  openChangeRef.current = onOpenChange;
  const successRef = useRef(onSuccess);
  successRef.current = onSuccess;
  const wasOpen = useRef(false);

  const reset = () => {
    setSelected(null);
    setMode("oauth");
    setApiKey("");
    setStatus("");
    setEvent(null);
    setPrompt(null);
    setPromptValue("");
    setError("");
    setSuccess(false);
    openedUrl.current = "";
  };

  useEffect(() => {
    if (!open) {
      if (wasOpen.current) {
        bridge?.loginCancel?.();
        reset();
      }
      wasOpen.current = false;
      return;
    }
    wasOpen.current = true;

    setLoading(true);
    setError("");

    const listener = (record: any) => {
      if (record.type === "login_providers") {
        setProviders(Array.isArray(record.providers) ? record.providers : []);
        setLoading(false);
        return;
      }

      if (record.type === "login_event") {
        const next = record.event;
        setEvent(next);
        if (next?.type === "auth_url" && next.url) {
          setStatus(next.instructions || "请在浏览器中完成授权");
          if (openedUrl.current !== next.url) {
            openedUrl.current = next.url;
            void bridge?.openExternal?.(next.url);
          }
        } else if (next?.type === "device_code") {
          setStatus("请在浏览器中输入设备码");
        } else if (next?.type === "progress") {
          setStatus(next.message || "处理中…");
        } else if (next?.type === "info") {
          setStatus(next.message || "");
        }
        return;
      }

      if (record.type === "login_prompt") {
        setPrompt({
          id: record.id,
          provider: record.provider,
          prompt: record.prompt,
        });
        setPromptValue("");
        return;
      }

      if (record.type === "login_logout_success") {
        if (Array.isArray(record.providers)) {
          setProviders(record.providers);
        }
        notifyRef.current("已退出登录", record.provider);
        return;
      }

      if (record.type === "login_success") {
        setSuccess(true);
        setLoading(false);
        setPrompt(null);
        setStatus("登录成功，正在刷新模型…");
        if (Array.isArray(record.providers)) {
          setProviders(record.providers);
        }
        notifyRef.current("Pi 登录成功", record.provider);
        successRef.current();
        window.setTimeout(() => openChangeRef.current(false), 1200);
        return;
      }

      if (record.type === "login_error") {
        setLoading(false);
        setError(record.message || "登录失败");
        setStatus("");
        return;
      }

      if (record.type === "login_cancelled") {
        setLoading(false);
        setStatus("已取消");
        setPrompt(null);
        return;
      }
    };

    bridge?.onRecord(listener);
    void bridge
      ?.loginProviders?.()
      .then((result) => {
        setProviders(result.providers || []);
        if (result.error) {
          setError(result.error);
        }
      })
      .catch((reason) => setError(String(reason)))
      .finally(() => setLoading(false));

    return () => bridge?.offRecord?.(listener);
  }, [open, bridge]);

  const filtered = providers.filter((provider) => {
    if (filter === "oauth" && !provider.hasOAuth) {
      return false;
    }
    if (filter === "api" && !provider.hasApiKey) {
      return false;
    }
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return true;
    }
    return [provider.id, provider.name, provider.oauthName || ""]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });

  useEffect(() => {
    providerListRef.current?.scrollTo({ top: 0 });
  }, [providers.length, query, filter]);

  const choose = (provider: LoginProvider) => {
    setSelected(provider);
    setMode(provider.hasOAuth ? "oauth" : "api_key");
    setApiKey("");
    setStatus("");
    setEvent(null);
    setPrompt(null);
    setPromptValue("");
    setError("");
    setSuccess(false);
    openedUrl.current = "";
  };

  const start = () => {
    if (!selected) {
      return;
    }

    if (mode === "api_key" && !apiKey.trim()) {
      setError("请输入 API Key");
      return;
    }

    setError("");
    setEvent(null);
    setPrompt(null);
    setStatus(mode === "oauth" ? "正在准备授权…" : "正在验证 API Key…");
    setLoading(true);
    void bridge
      ?.loginStart?.({
        provider: selected.id,
        mode,
        apiKey: apiKey.trim(),
      })
      .then((result) => {
        if (result?.error) {
          setError(result.error);
          setLoading(false);
        }
      })
      .catch((reason) => {
        setError(String(reason));
        setLoading(false);
      });
  };

  const logout = (provider: LoginProvider) => {
    const request = bridge?.logoutProvider?.({ provider: provider.id });
    request?.then((result) => {
      if (result?.error) {
        notifyRef.current("退出登录失败", result.error);
      }
    });
  };

  const respond = (value: string, cancelled = false) => {
    if (!prompt) {
      return;
    }

    void bridge?.loginPromptResponse?.({
      id: prompt.id,
      value,
      cancelled,
    });
    setPrompt(null);
    setPromptValue("");
  };

  const back = () => {
    bridge?.loginCancel?.();
    reset();
  };

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value);
        if (!value) {
          reset();
        }
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="rx-overlay" />
        <DialogPrimitive.Content className="dialog login-dialog">
          <div className="dialog-head">
            <div>
              <DialogPrimitive.Title className="dialog-title">
                登录 Pi 服务商
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="dialog-desc">
                直接调用 Pi 原生 ModelRuntime · OAuth / API Key
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="icon" aria-label="关闭">
                <X size={15} />
              </Button>
            </DialogPrimitive.Close>
          </div>

          {!selected ? (
            <>
              <div className="preset-toolbar">
                <div className="search preset-search">
                  <Search size={14} />
                  <input
                    value={query}
                    onChange={(item) => setQuery(item.target.value)}
                    placeholder="搜索服务商…"
                  />
                </div>
                <span className="preset-count">
                  {loading ? (
                    <span className="inline-loading">
                      <LoadingRing /> 加载中…
                    </span>
                  ) : (
                    `${filtered.length} 个服务商`
                  )}
                </span>
              </div>
              <div className="login-filters">
                {[
                  { id: "all", label: "全部" },
                  { id: "oauth", label: "OAuth" },
                  { id: "api", label: "API Key" },
                ].map((item) => (
                  <button type="button"
                    key={item.id}
                    className={filter === item.id ? "on" : ""}
                    onClick={() =>
                      setFilter(item.id as "all" | "oauth" | "api")
                    }
                  >
                    {item.id === "all" ? (
                      <Globe size={12} />
                    ) : item.id === "oauth" ? (
                      <ShieldCheck size={12} />
                    ) : (
                      <KeyRound size={12} />
                    )}
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="login-provider-scroll" ref={providerListRef}>
                {filtered.map((provider) => (
                  <button type="button"
                    key={provider.id}
                    className="login-provider"
                    onClick={() => choose(provider)}
                  >
                    <span className="login-provider-main">
                      <b>{provider.name}</b>
                      <small>
                        {provider.id} · {provider.modelCount} 个模型
                        {provider.configured ? " · 已配置" : ""}
                      </small>
                    </span>
                    <span className="login-provider-tags">
                      {provider.hasOAuth && <Tag tone="mint">OAuth</Tag>}
                      {provider.hasApiKey && <Tag>API Key</Tag>}
                      {provider.configured && (
                        <span
                          className="login-logout"
                          role="button"
                          tabIndex={0}
                          onClick={(event) => {
                            event.stopPropagation();
                            logout(provider);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.stopPropagation();
                              logout(provider);
                            }
                          }}
                        >
                          <LogOut size={11} /> 退出
                        </span>
                      )}
                      <ChevronRight size={13} />
                    </span>
                  </button>
                ))}
                {!loading && filtered.length === 0 && (
                  <div className="preset-empty">没有匹配的服务商</div>
                )}
              </div>
            </>
          ) : (
            <div className="login-flow">
              <button type="button" className="preset-back" onClick={back}>
                <ChevronLeft size={12} /> 返回服务商
              </button>

              <div className="login-flow-head">
                <span className="login-flow-icon">
                  <LogIn size={16} />
                </span>
                <div>
                  <b>{selected.name}</b>
                  <small>
                    {selected.id} · {selected.modelCount} 个模型
                  </small>
                </div>
              </div>

              {!success && (
                <>
                  {selected.hasOAuth && selected.hasApiKey && (
                    <div className="login-mode">
                      <button type="button"
                        className={mode === "oauth" ? "on" : ""}
                        onClick={() => {
                          setMode("oauth");
                          setError("");
                          setEvent(null);
                          setPrompt(null);
                        }}
                      >
                        <ShieldCheck size={12} /> OAuth 登录
                      </button>
                      <button type="button"
                        className={mode === "api_key" ? "on" : ""}
                        onClick={() => {
                          setMode("api_key");
                          setError("");
                          setEvent(null);
                          setPrompt(null);
                        }}
                      >
                        <KeyRound size={12} /> API Key
                      </button>
                    </div>
                  )}

                  {mode === "api_key" && (
                    <>
                      <label className="field-label">API Key</label>
                      <input
                        className="input"
                        type="password"
                        value={apiKey}
                        onChange={(item) => setApiKey(item.target.value)}
                        placeholder="sk-..."
                      />
                    </>
                  )}

                  {status && <p className="login-status">{status}</p>}

                  {event?.type === "auth_url" && (
                    <div className="login-auth-box">
                      <b>浏览器授权</b>
                      <p>{event.instructions || "在浏览器中完成授权后回到这里。"}</p>
                      <div className="login-auth-actions">
                        <Button
                          variant="secondary"
                          onClick={() => void bridge?.openExternal?.(event.url)}
                        >
                          <Link2 size={12} /> 打开授权页
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            copyText(event.url);
                            onNotify("已复制授权链接");
                          }}
                        >
                          <Copy size={12} /> 复制链接
                        </Button>
                      </div>
                    </div>
                  )}

                  {event?.type === "device_code" && (
                    <div className="login-auth-box">
                      <b>设备码登录</b>
                      <p>在浏览器中输入下面的设备码：</p>
                      <div className="login-device-code">
                        <code>{event.userCode}</code>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            copyText(event.userCode);
                            onNotify("已复制设备码");
                          }}
                        >
                          <Copy size={12} /> 复制
                        </Button>
                      </div>
                      <Button
                        variant="secondary"
                        onClick={() =>
                          void bridge?.openExternal?.(event.verificationUri)
                        }
                      >
                        <Link2 size={12} /> 打开验证页
                      </Button>
                    </div>
                  )}

                  {prompt && (
                    <div className="login-prompt">
                      <b>{prompt.prompt.message || "需要补充信息"}</b>
                      {prompt.prompt.type === "select" ? (
                        <div className="login-prompt-options">
                          {prompt.prompt.options?.map((option) => (
                            <button type="button"
                              key={option.id}
                              className="login-prompt-option"
                              onClick={() => respond(option.id)}
                            >
                              <span className="login-prompt-option-main">
                                <ArrowRight size={12} />
                                <b>{option.label}</b>
                              </span>
                              {option.description && (
                                <small>{option.description}</small>
                              )}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="preset-manual">
                          <input
                            className="input"
                            type={
                              prompt.prompt.type === "secret"
                                ? "password"
                                : "text"
                            }
                            value={promptValue}
                            onChange={(item) =>
                              setPromptValue(item.target.value)
                            }
                            placeholder={prompt.prompt.placeholder || ""}
                          />
                          <Button
                            variant="secondary"
                            icon={<Check size={12} />}
                            onClick={() => respond(promptValue)}
                            disabled={!promptValue.trim()}
                          >
                            提交
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {error && <p className="preset-error">{error}</p>}

                  <div className="dialog-foot preset-foot">
                    <span className="muted">
                      {mode === "oauth"
                        ? "授权完成后会自动保存到 Pi auth.json"
                        : "Key 只写入本机 auth.json"}
                    </span>
                    <div>
                      <Button
                        variant="secondary"
                        icon={<X size={12} />}
                        onClick={back}
                      >
                        取消
                      </Button>
                      <Button
                        variant="primary"
                        onClick={start}
                        disabled={loading || (mode === "api_key" && !apiKey.trim())}
                      >
                        <LogIn size={12} />
                        {loading ? (
                          <>
                            <LoadingRing /> 处理中…
                          </>
                        ) : (
                          "开始登录"
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {success && (
                <div className="login-success">
                  <Check size={20} />
                  <b>登录成功</b>
                  <p>正在刷新 Pi 模型列表…</p>
                </div>
              )}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export default LoginDialog;
