import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import {
  Archive,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  Cpu,
  Download,
  Eraser,
  Eye,
  FileText,
  FolderOpen,
  Gauge,
  GitBranch,
  Keyboard,
  LogIn,
  MessagesSquare,
  Minus,
  Palette,
  Puzzle,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  Smartphone,
  Terminal,
  Trash2,
  Wifi,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { Button } from "./Button";
import { Checkbox, Segmented, Switch } from "./form-controls";
import {
  accents,
  shortcuts,
  type AccentKey,
  type Density,
  type Model,
  type PiUpdateStatus,
  type UpdateStatus,
} from "./settings-config";
import { Tag } from "./Tag";

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    window.matchMedia(query).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const handler = () => setMatches(media.matches);
    handler();
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

function SettingsDialog({
  open,
  onOpenChange,
  dark,
  onDark,
  density,
  onDensity,
  budgetUsd,
  onBudgetUsd,
  accentKey,
  onAccent,
  model,
  modelOptions,
  onModel,
  reasoning,
  reasoningOptions,
  onReasoning,
  tab,
  onTabChange,
  onImportPi,
  onOpenModels,
  onRefreshModels,
  onPiLogin,
  onRefreshAuth,
  authProviders,
  onOpenCustomProvider,
  updateStatus,
  piUpdateStatus,
  onCheckUpdate,
  onDownloadUpdate,
  onInstallUpdate,
  onSaveUpdateFeed,
  onClearUpdateFeed,
  onCheckPiUpdate,
  onInstallPiUpdate,
  onRestorePiKernel,
  onOpenModelBrowser,
  onOpenFiles,
  onOpenTerminal,
  onOpenBranches,
  onOpenArchive,
  onOpenLog,
  onOpenExtensions,
  onExportSession,
  onOpenRemote,
  onClearProviders,
  restore,
  onRestore,
  streaming,
  onStreaming,
  autoCompact,
  onAutoCompact,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dark: boolean;
  onDark: (value: boolean) => void;
  density: Density;
  onDensity: (value: Density) => void;
  budgetUsd: number;
  onBudgetUsd: (value: number) => void;
  accentKey: AccentKey;
  onAccent: (value: AccentKey) => void;
  model: Model;
  modelOptions: Model[];
  onModel: (value: Model) => void;
  reasoning: string;
  reasoningOptions: string[];
  onReasoning: (value: string) => void;
  tab: string;
  onTabChange: (value: string) => void;
  onImportPi: () => void;
  onOpenModels: () => void;
  onRefreshModels: () => void;
  onPiLogin: () => void;
  onRefreshAuth: () => void;
  authProviders: string[];
  onOpenCustomProvider: () => void;
  updateStatus: UpdateStatus | null;
  piUpdateStatus: PiUpdateStatus | null;
  onCheckUpdate: () => void;
  onDownloadUpdate: () => void;
  onInstallUpdate: () => void;
  onSaveUpdateFeed: (url: string) => void;
  onClearUpdateFeed: () => void;
  onCheckPiUpdate: () => void;
  onInstallPiUpdate: () => void;
  onRestorePiKernel: () => void;
  onOpenModelBrowser: () => void;
  onOpenFiles: () => void;
  onOpenTerminal: () => void;
  onOpenBranches: () => void;
  onOpenArchive: () => void;
  onOpenLog: () => void;
  onOpenExtensions: () => void;
  onExportSession: () => void;
  onOpenRemote: () => void;
  onClearProviders: () => void;
  restore: boolean;
  onRestore: (value: boolean) => void;
  streaming: boolean;
  onStreaming: (value: boolean) => void;
  autoCompact: boolean;
  onAutoCompact: (value: boolean) => void;
  onSave: () => void;
}) {
  const verticalTabs = useMediaQuery("(min-width: 760px)");
  const [feedUrl, setFeedUrl] = useState(updateStatus?.feedUrl || "");
  const [closeToTray, setCloseToTray] = useState(true);
  const [notifyOnComplete, setNotifyOnComplete] = useState(true);
  const [catalog, setCatalog] = useState<{
    models: number;
    providers: number;
    available: number;
  } | null>(null);
  const [feishuDraft, setFeishuDraft] = useState<TesTFeishuConfig>({
    appId: "",
    appSecret: "",
    enabled: false,
    longConnection: true,
    autoPair: true,
    receiveIdType: "chat_id",
    receiveId: "",
    allowedOpenIds: [],
    allowAll: false,
  });
  const [feishuOpenIdsText, setFeishuOpenIdsText] = useState("");
  const [feishuHasSecret, setFeishuHasSecret] = useState(false);
  const [feishuValidation, setFeishuValidation] = useState<{
    ok: boolean;
    errors: string[];
  } | null>(null);
  const [feishuPath, setFeishuPath] = useState("");
  const [feishuSaving, setFeishuSaving] = useState(false);
  const [feishuNotice, setFeishuNotice] = useState("");
  const [permissionRules, setPermissionRules] = useState<string[]>([]);
  const [permissionRulesPath, setPermissionRulesPath] = useState("");
  const [dataLocationInfo, setDataLocationInfo] = useState<{
    dataDir: string;
    packaged: boolean;
    pointerFile: string;
  } | null>(null);
  const [dataLocationError, setDataLocationError] = useState("");
  const [shortcutOverrides, setShortcutOverrides] = useState<
    Record<string, string>
  >(() => {
    try {
      return JSON.parse(localStorage.getItem("tesT.shortcuts") || "{}");
    } catch {
      return {};
    }
  });
  const [shortcutConflict, setShortcutConflict] = useState("");

  useEffect(() => {
    if (!open || !window.tesT?.dataLocation) {
      return;
    }
    void window.tesT.dataLocation().then(setDataLocationInfo);
  }, [open]);

  const migrateDataLocation = () => {
    void window.tesT?.migrateDataLocation?.().then((result) => {
      if (result?.error) {
        setDataLocationError(result.error);
        return;
      }
      setDataLocationError("");
      if (result?.ok) {
        setDataLocationInfo((current) =>
          current
            ? { ...current, dataDir: result.dataDir || current.dataDir }
            : current,
        );
      }
    });
  };

  const setShortcut = (id: string, value: string) => {
    const normalized = value.trim().toLowerCase();
    if (normalized) {
      const duplicate = shortcuts.find((item) => {
        if (!item.id || item.id === id) {
          return false;
        }
        return (
          (shortcutOverrides[item.id] || item.keys.join("+")).toLowerCase() ===
          normalized
        );
      });
      if (duplicate) {
        setShortcutConflict(`与“${duplicate.label}”冲突`);
        return;
      }
    }
    setShortcutConflict("");
    setShortcutOverrides((current) => {
      const next = { ...current };
      if (value.trim()) {
        next[id] = value.trim();
      } else {
        delete next[id];
      }
      localStorage.setItem("tesT.shortcuts", JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    if (!open || tab !== "tools" || !window.tesT?.permissionRules) {
      return;
    }
    let cancelled = false;
    void window.tesT.permissionRules().then((result) => {
      if (!cancelled) {
        setPermissionRules(Array.isArray(result?.rules) ? result.rules : []);
        setPermissionRulesPath(result?.path || "");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, tab]);

  const clearPermissionRules = () => {
    void window.tesT?.clearPermissionRules?.().then((result) => {
      if (result?.ok) {
        setPermissionRules([]);
      }
    });
  };
  const [feishuChannel, setFeishuChannel] =
    useState<TesTChannelStatus | null>(null);
  const authKey = authProviders.join("|");

  useEffect(() => {
    setFeedUrl(updateStatus?.feedUrl || "");
  }, [updateStatus?.feedUrl]);

  useEffect(() => {
    if (!open || !window.tesT?.behaviorGet) {
      return;
    }
    void window.tesT
      .behaviorGet()
      .then((value) => {
        setCloseToTray(value.closeToTray !== false);
        setNotifyOnComplete(value.notifyOnComplete !== false);
      })
      .catch(() => {});
  }, [open]);

  const updateBehavior = (patch: {
    closeToTray?: boolean;
    notifyOnComplete?: boolean;
  }) => {
    if (patch.closeToTray !== undefined) {
      setCloseToTray(patch.closeToTray);
    }
    if (patch.notifyOnComplete !== undefined) {
      setNotifyOnComplete(patch.notifyOnComplete);
    }
    void window.tesT?.behaviorSet?.(patch);
  };

  useEffect(() => {
    if (!open || !window.tesT?.listModelCatalog) {
      return;
    }

    let cancelled = false;
    void window.tesT
      .listModelCatalog()
      .then((result) => {
        if (cancelled || result?.error) {
          return;
        }
        setCatalog({
          models: result.models.length,
          providers: result.providers.length,
          available: result.models.filter((item) => item.available).length,
        });
      })
      .catch(() => {
        // The catalog is optional; keep the current dropdown usable.
      });

    return () => {
      cancelled = true;
    };
  }, [open, authKey]);

  const loadFeishuConfig = async () => {
    if (!window.tesT?.feishuConfig) {
      return;
    }
    try {
      const result = await window.tesT.feishuConfig();
      if (result?.error) {
        setFeishuNotice(result.error);
        return;
      }
      if (result.config) {
        setFeishuDraft(result.config);
        setFeishuOpenIdsText(result.config.allowedOpenIds.join("\n"));
      }
      setFeishuHasSecret(Boolean(result.hasSecret));
      setFeishuValidation(result.validation || null);
      setFeishuPath(result.path || "");
      setFeishuNotice("");
    } catch (error) {
      setFeishuNotice(String((error as Error)?.message || error));
    }
  };

  useEffect(() => {
    if (open && tab === "feishu") {
      void loadFeishuConfig();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab]);

  useEffect(() => {
    if (!open || tab !== "feishu" || !window.tesT?.remoteChannels) {
      return;
    }
    let cancelled = false;
    const load = () => {
      void window.tesT
        ?.remoteChannels?.()
        .then((list) => {
          if (cancelled) {
            return;
          }
          setFeishuChannel(
            list.find((item) => item.id === "feishu") || null,
          );
        })
        .catch(() => {});
    };
    load();
    const timer = window.setInterval(load, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [open, tab]);

  const connectFeishu = async () => {
    if (!window.tesT?.saveFeishuConfig) {
      setFeishuNotice("当前环境不支持飞书接入");
      return;
    }
    setFeishuSaving(true);
    setFeishuNotice("");
    try {
      const verify = await window.tesT.verifyFeishuConfig?.({
        appId: feishuDraft.appId,
        appSecret: feishuDraft.appSecret,
      });
      if (verify && !verify.ok) {
        setFeishuNotice(
          `凭证校验失败：${verify.error || "请检查 App ID / App Secret"}`,
        );
        return;
      }

      const allowedOpenIds = feishuOpenIdsText
        .split(/[\n,，]/)
        .map((item) => item.trim())
        .filter(Boolean);
      const firstPair = !allowedOpenIds.length && !feishuDraft.receiveId;
      const result = await window.tesT.saveFeishuConfig({
        ...feishuDraft,
        enabled: true,
        autoPair: firstPair ? true : feishuDraft.autoPair,
        allowedOpenIds,
        receiveId: firstPair ? "" : feishuDraft.receiveId,
      });
      if (result?.error) {
        setFeishuNotice(result.error);
        return;
      }
      if (result.config) {
        setFeishuDraft(result.config);
        setFeishuOpenIdsText(result.config.allowedOpenIds.join("\n"));
      }
      setFeishuHasSecret(Boolean(result.hasSecret));
      setFeishuValidation(result.validation || null);
      setFeishuPath(result.path || "");
      setFeishuNotice(
        "凭证通过，正在连接飞书。现在用手机飞书私聊机器人，发送“你好”。",
      );
    } catch (error) {
      setFeishuNotice(String((error as Error)?.message || error));
    } finally {
      setFeishuSaving(false);
    }
  };

  const saveFeishuConfig = async () => {
    if (!window.tesT?.saveFeishuConfig) {
      setFeishuNotice("当前环境不支持保存飞书配置");
      return;
    }
    setFeishuSaving(true);
    setFeishuNotice("");
    try {
      const allowedOpenIds = feishuOpenIdsText
        .split(/[\n,，]/)
        .map((item) => item.trim())
        .filter(Boolean);
      const result = await window.tesT.saveFeishuConfig({
        ...feishuDraft,
        allowedOpenIds,
      });
      if (result?.error) {
        setFeishuNotice(result.error);
        return;
      }
      if (result.config) {
        setFeishuDraft(result.config);
        setFeishuOpenIdsText(result.config.allowedOpenIds.join("\n"));
      }
      setFeishuHasSecret(Boolean(result.hasSecret));
      setFeishuValidation(result.validation || null);
      setFeishuPath(result.path || "");
      setFeishuNotice(
        result.enabled
          ? "配置已保存，正在连接飞书长连接。"
          : "配置已保存；启用后会自动连接飞书。",
      );
    } catch (error) {
      setFeishuNotice(String((error as Error)?.message || error));
    } finally {
      setFeishuSaving(false);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="rx-overlay" />
        <DialogPrimitive.Content
          className="dialog settings-dialog"
          tabIndex={-1}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            (event.currentTarget as HTMLElement).focus();
          }}
        >
          <div className="dialog-head">
            <div>
              <DialogPrimitive.Title className="dialog-title">
                设置
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="dialog-desc">
                所有修改即时生效
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="icon" aria-label="关闭">
                <X size={15} />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <TabsPrimitive.Root
            value={tab}
            onValueChange={onTabChange}
            orientation={verticalTabs ? "vertical" : "horizontal"}
            className="settings-tabs"
          >
            <TabsPrimitive.List className="tabs-list" aria-label="设置分类">
              <TabsPrimitive.Trigger className="tabs-trigger" value="appearance">
                <Palette size={13} /> 通用
              </TabsPrimitive.Trigger>
              <TabsPrimitive.Trigger className="tabs-trigger" value="models">
                <Cpu size={13} /> 模型
              </TabsPrimitive.Trigger>
              <TabsPrimitive.Trigger className="tabs-trigger" value="tools">
                <Wrench size={13} /> 工具
              </TabsPrimitive.Trigger>
              <TabsPrimitive.Trigger className="tabs-trigger" value="feishu">
                <MessagesSquare size={13} /> 飞书
              </TabsPrimitive.Trigger>
              <TabsPrimitive.Trigger className="tabs-trigger" value="shortcuts">
                <Keyboard size={13} /> 快捷键
              </TabsPrimitive.Trigger>
              <TabsPrimitive.Trigger className="tabs-trigger" value="update">
                <Download size={13} /> 更新
              </TabsPrimitive.Trigger>
            </TabsPrimitive.List>

            <TabsPrimitive.Content value="appearance" className="tabs-content">
              <div className="setting-row">
                <div>
                  <b>深色模式</b>
                </div>
                <div className="setting-control">
                  <Switch checked={dark} onChange={() => onDark(!dark)} />
                </div>
              </div>

              <div className="setting-row">
                <div>
                  <b>界面密度</b>
                </div>
                <div className="setting-control">
                  <Segmented
                    value={density}
                    onChange={(value) => onDensity(value as Density)}
                    options={[
                      {
                        value: "comfortable",
                        label: "舒适",
                        icon: <Eye size={11} />,
                      },
                      {
                        value: "compact",
                        label: "紧凑",
                        icon: <Minus size={11} />,
                      },
                    ]}
                  />
                </div>
              </div>

              <div className="setting-row">
                <div>
                  <b>强调色</b>
                </div>
                <div className="setting-control">
                  <ToggleGroupPrimitive.Root
                    className="toggle-group"
                    type="single"
                    value={accentKey}
                    onValueChange={(value) => {
                      if (value) onAccent(value as AccentKey);
                    }}
                  >
                    {(Object.keys(accents) as AccentKey[]).map((key) => (
                      <ToggleGroupPrimitive.Item
                        key={key}
                        value={key}
                        className="toggle-item"
                      >
                        <span className={`accent-dot accent-${key}`} />
                        {accents[key].label}
                      </ToggleGroupPrimitive.Item>
                    ))}
                  </ToggleGroupPrimitive.Root>
                </div>
              </div>

              <SeparatorPrimitive.Root className="sep-line" />

              <div className="settings-section-head">会话</div>
              <div className="setting-row">
                <div>
                  <b>启动时恢复上一次会话</b>
                </div>
                <div className="setting-control">
                  <Checkbox
                    checked={restore}
                    onChange={() => onRestore(!restore)}
                  />
                </div>
              </div>

              <div className="setting-row">
                <div>
                  <b>流式输出</b>
                </div>
                <div className="setting-control">
                  <Switch
                    checked={streaming}
                    onChange={() => onStreaming(!streaming)}
                  />
                </div>
              </div>

              <div className="setting-row">
                <div>
                  <b>自动压缩上下文</b>
                </div>
                <div className="setting-control">
                  <Switch
                    checked={autoCompact}
                    onChange={() => onAutoCompact(!autoCompact)}
                  />
                </div>
              </div>

              <div className="settings-section-head">桌面行为</div>
              <div className="setting-row">
                <div>
                  <b>关闭时最小化到托盘</b>
                </div>
                <div className="setting-control">
                  <Switch
                    checked={closeToTray}
                    onChange={() =>
                      updateBehavior({
                        closeToTray: !closeToTray,
                      })
                    }
                  />
                </div>
              </div>
              <div className="setting-row">
                <div>
                  <b>任务完成时通知</b>
                  <small>窗口不在前台时</small>
                </div>
                <div className="setting-control">
                  <Switch
                    checked={notifyOnComplete}
                    onChange={() =>
                      updateBehavior({
                        notifyOnComplete: !notifyOnComplete,
                      })
                    }
                  />
                </div>
              </div>
              <div className="settings-section-head">存储</div>
              <div className="setting-row">
                <div>
                  <b>数据保存位置</b>
                  <small title={dataLocationInfo?.dataDir}>
                    {dataLocationInfo?.dataDir || "读取中…"}
                  </small>
                </div>
                <div className="setting-control">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<FolderOpen size={12} />}
                    onClick={migrateDataLocation}
                  >
                    迁移目录
                  </Button>
                </div>
              </div>
              {dataLocationError && (
                <p className="preset-error">{dataLocationError}</p>
              )}
            </TabsPrimitive.Content>

            <TabsPrimitive.Content value="models" className="tabs-content">
              <div className="settings-section-head">账号</div>
                <div className="pi-login-card">
                  <div className="pi-login-head">
                    <span className="pi-login-icon">
                      <LogIn size={15} />
                    </span>
                    <div>
                      <b>登录 Pi 账号</b>
                      <small>
                        Claude / ChatGPT / Gemini 等 OAuth 或 API Key
                      </small>
                    </div>
                    <Button
                      variant="primary"
                      className="pi-login-btn"
                      onClick={onPiLogin}
                    >
                      <LogIn size={12} /> 打开登录
                    </Button>
                  </div>
                  <div className="pi-login-status">
                    <span>
                      {authProviders.length > 0
                        ? `已登录：${authProviders.join(" · ")}`
                        : "还没有登录任何 Pi 服务商"}
                    </span>
                    <span className="pi-login-actions">
                      <button type="button" className="link" onClick={onRefreshModels}>
                        <RefreshCw size={11} /> {modelOptions.length} 个模型 ·
                        刷新
                      </button>
                      <button type="button" className="link" onClick={onRefreshAuth}>
                        <ShieldCheck size={11} /> 检查登录
                      </button>
                    </span>
                  </div>
                  <p className="pi-login-hint">
                    {window.tesT?.nativeLogin ? (
                      <>
                        应用内完成 OAuth 或 API Key 登录，无需终端；
                        成功后会自动重启 Pi 并刷新模型。
                      </>
                    ) : (
                      <>
                        会打开 Pi 原版登录窗口并自动进入 <code>/login</code>；
                        登录完成后关闭该窗口，TesT 会自动重启 Pi 并刷新模型。
                      </>
                    )}
                  </p>
                </div>

              <div className="settings-section-head">模型</div>
              {!model.id && modelOptions.length > 0 && (
                <div className="model-setup-callout" role="note">
                  <div>
                    <b>还差一步</b>
                    <span>
                      已检测到 {modelOptions.length} 个可用模型，请选择一个默认模型。
                    </span>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => onModel(modelOptions[0])}
                  >
                    使用 {modelOptions[0].short}
                  </Button>
                </div>
              )}
              <div className="setting-row">
                <div>
                  <b>默认模型</b>
                  <small>
                    已就绪 {modelOptions.length} 个
                    {catalog
                      ? ` · Pi 全目录 ${catalog.models} 个 / ${catalog.providers} 个 Provider`
                      : " · 新会话默认使用，当前会话立即生效"}
                  </small>
                </div>
                <div className="setting-control">
                  <SelectPrimitive.Root
                    value={model.id}
                    onValueChange={(value) => {
                      if (value === "__browse__") {
                        onOpenModelBrowser();
                        return;
                      }
                      const next = modelOptions.find(
                        (item) => item.id === value,
                      );
                      if (next) onModel(next);
                    }}
                  >
                    <SelectPrimitive.Trigger className="select-trigger">
                      <span className="select-trigger-value">
                        <Cpu size={12} />
                        <SelectPrimitive.Value placeholder="未配置" />
                      </span>
                      <SelectPrimitive.Icon>
                        <ChevronDown size={12} />
                      </SelectPrimitive.Icon>
                    </SelectPrimitive.Trigger>
                    <SelectPrimitive.Portal>
                      <SelectPrimitive.Content
                        className="select-content"
                        position="popper"
                        sideOffset={5}
                      >
                        <SelectPrimitive.Viewport className="select-viewport">
                          <SelectPrimitive.Group>
                            <SelectPrimitive.Label className="select-label">
                              已就绪 {modelOptions.length} 个 · 全目录{" "}
                              {catalog ? catalog.models : "…"} 个
                            </SelectPrimitive.Label>
                            <SelectPrimitive.Item
                              value="__browse__"
                              className="select-item select-browse"
                            >
                              <SelectPrimitive.ItemText>
                                浏览全部
                                {catalog ? ` ${catalog.models} ` : " "}
                                个模型…
                              </SelectPrimitive.ItemText>
                            </SelectPrimitive.Item>
                            <SelectPrimitive.Separator className="select-sep" />
                            {modelOptions.map((item) => (
                              <SelectPrimitive.Item
                                key={item.id}
                                value={item.id}
                                className="select-item"
                              >
                                <SelectPrimitive.ItemIndicator className="select-indicator">
                                  <Check size={11} />
                                </SelectPrimitive.ItemIndicator>
                                <SelectPrimitive.ItemText>
                                  {item.label}
                                </SelectPrimitive.ItemText>
                              </SelectPrimitive.Item>
                            ))}
                          </SelectPrimitive.Group>
                        </SelectPrimitive.Viewport>
                      </SelectPrimitive.Content>
                    </SelectPrimitive.Portal>
                  </SelectPrimitive.Root>
                </div>
              </div>

              <button type="button"
                className="select-like import-row"
                onClick={onOpenModelBrowser}
              >
                <span>
                  <b>浏览全部模型</b>
                  <small>
                    {catalog
                      ? `${catalog.available} 个可用 · 共 ${catalog.models} 个模型、${catalog.providers} 个 Provider`
                      : "Pi 内置目录 · 可用 / 需登录一目了然"}
                  </small>
                </span>
                <ChevronRight size={13} />
              </button>

              <div className="setting-row">
                <div>
                  <b>会话预算</b>
                  <small>超过后提示，不阻止请求</small>
                </div>
                <div className="setting-control">
                  <input
                    className="input budget-input"
                    type="number"
                    min="0"
                    step="1"
                    value={budgetUsd || ""}
                    placeholder="不限制"
                    onChange={(event) =>
                      onBudgetUsd(Number(event.target.value) || 0)
                    }
                  />
                </div>
              </div>

              <div className="setting-row">
                <div>
                  <b>推理强度</b>
                  <small>影响延迟与 token 消耗</small>
                </div>
                <div className="setting-control">
                  <ToggleGroupPrimitive.Root
                    className="toggle-group"
                    type="single"
                    value={reasoning}
                    onValueChange={(value) => {
                      if (value) onReasoning(value);
                    }}
                  >
                    {reasoningOptions.map((level) => (
                      <ToggleGroupPrimitive.Item
                        key={level}
                        value={level}
                        className="toggle-item"
                      >
                        {level === "low" ? (
                          <Gauge size={11} />
                        ) : level === "medium" ? (
                          <Zap size={11} />
                        ) : (
                          <Brain size={11} />
                        )}
                        {level}
                      </ToggleGroupPrimitive.Item>
                    ))}
                  </ToggleGroupPrimitive.Root>
                </div>
              </div>

              <div className="settings-section-head">导入与维护</div>
              <button type="button"
                className="select-like import-row"
                onClick={onImportPi}
              >
                <span>
                  <b>从 Pi 导入</b>
                  <small>读取 ~/.pi/agent 的渠道与登录凭证</small>
                </span>
                <ChevronRight size={13} />
              </button>

              <button type="button"
                className="select-like import-row"
                onClick={onOpenModels}
              >
                <span>
                  <b>打开 models.json</b>
                  <small>配置 provider / baseUrl / model</small>
                </span>
                <ChevronRight size={13} />
              </button>

              <button type="button"
                className="select-like import-row"
                onClick={onOpenCustomProvider}
              >
                <span>
                  <b>添加自定义 Provider</b>
                  <small>Base URL / API 类型 / Key / 模型</small>
                </span>
                <ChevronRight size={13} />
              </button>

              <button type="button"
                className="select-like import-row preset-clear"
                onClick={onClearProviders}
              >
                <span>
                  <b>撤销模型配置</b>
                  <small>清空 models.json（自动保留 .bak 备份）</small>
                </span>
                <Trash2 size={13} />
              </button>
            </TabsPrimitive.Content>

            <TabsPrimitive.Content value="tools" className="tabs-content">
              <div className="settings-section-head">工作区</div>
              <button type="button"
                className="select-like import-row"
                onClick={onOpenFiles}
              >
                <span>
                  <b>工作区文件</b>
                  <small>只读预览与复制</small>
                </span>
                <FileText size={14} />
              </button>
              <button type="button"
                className="select-like import-row"
                onClick={onOpenTerminal}
              >
                <span>
                  <b>终端</b>
                  <small>在当前工作区运行命令</small>
                </span>
                <Terminal size={14} />
              </button>
              <button type="button"
                className="select-like import-row"
                onClick={onOpenBranches}
              >
                <span>
                  <b>Git 分支</b>
                  <small>新建 / 切换 / 删除</small>
                </span>
                <GitBranch size={14} />
              </button>

              <div className="settings-section-head">Pi</div>
              <button type="button"
                className="select-like import-row"
                onClick={onOpenExtensions}
              >
                <span>
                  <b>技能与扩展</b>
                  <small>管理 Pi skills 和扩展</small>
                </span>
                <Puzzle size={14} />
              </button>

              <div className="settings-section-head">危险命令授权</div>
              <div className="permission-rules">
                {permissionRules.length === 0 ? (
                  <span className="muted">
                    还没有永久允许的命令
                  </span>
                ) : (
                  permissionRules.map((command) => (
                    <code key={command} title={command}>
                      {command}
                    </code>
                  ))
                )}
              </div>
              <div className="permission-rules-actions">
                <span className="muted">
                  {permissionRulesPath ||
                    "规则保存在 ~/.pi/agent/tesT-permissions.json"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Trash2 size={12} />}
                  disabled={permissionRules.length === 0}
                  onClick={clearPermissionRules}
                >
                  清空授权
                </Button>
              </div>

              <div className="settings-section-head">诊断</div>
              <button type="button"
                className="select-like import-row"
                onClick={onOpenLog}
              >
                <span>
                  <b>运行日志</b>
                  <small>electron.log</small>
                </span>
                <FileText size={14} />
              </button>

              <div className="settings-section-head">会话</div>
              <button type="button"
                className="select-like import-row"
                onClick={onExportSession}
              >
                <span>
                  <b>导出当前会话</b>
                  <small>Markdown</small>
                </span>
                <Download size={14} />
              </button>
              <button type="button"
                className="select-like import-row"
                onClick={onOpenArchive}
              >
                <span>
                  <b>归档会话</b>
                  <small>恢复已归档</small>
                </span>
                <Archive size={14} />
              </button>

              <div className="settings-section-head">连接</div>
              <button type="button"
                className="select-like import-row"
                onClick={onOpenRemote}
              >
                <span>
                  <b>手机远程</b>
                  <small>局域网 / Tailscale</small>
                </span>
                <Smartphone size={14} />
              </button>
            </TabsPrimitive.Content>

            <TabsPrimitive.Content value="feishu" className="tabs-content">
              <div className="settings-section-head">飞书机器人</div>
              {feishuChannel && (
                <div className="feishu-channel">
                  <span
                    className={`usage-chip ${
                      feishuChannel.state === "online"
                        ? "ready"
                        : feishuChannel.state === "error"
                          ? "error"
                          : feishuChannel.state === "starting" ||
                              feishuChannel.state === "reconnecting"
                            ? "connecting"
                            : ""
                    }`}
                  >
                    <i />
                    飞书 · {feishuChannel.state}
                  </span>
                  <small>
                    {feishuChannel.lastError ||
                      feishuChannel.message ||
                      "尚未连接"}
                  </small>
                </div>
              )}
              <div className="feishu-wizard">
                <div className="feishu-steps">
                  <span className="on">1 凭证</span>
                  <span className={feishuChannel?.state === "online" ? "on" : ""}>
                    2 连接
                  </span>
                  <span
                    className={
                      feishuDraft.allowedOpenIds.length ||
                      feishuChannel?.message?.includes("已自动配对")
                        ? "on"
                        : ""
                    }
                  >
                    3 配对
                  </span>
                </div>

                <div className="feishu-card feishu-quick">
                  <div className="feishu-card-head">
                    <div>
                      <b>1. 填应用凭证</b>
                      <small>
                        飞书开放平台 → 凭证与基础信息。只填 App ID 和 App Secret
                        就能开始。
                      </small>
                    </div>
                    <Tag
                      tone={
                        feishuDraft.allowedOpenIds.length ||
                        feishuChannel?.message?.includes("已自动配对")
                          ? "mint"
                          : feishuChannel?.state === "online"
                            ? "amber"
                            : "gray"
                      }
                    >
                      {feishuDraft.allowedOpenIds.length ||
                      feishuChannel?.message?.includes("已自动配对")
                        ? "已配对"
                        : feishuChannel?.state === "online"
                          ? "等待配对"
                          : "未连接"}
                    </Tag>
                  </div>

                  <label className="field-label" htmlFor="feishu-quick-app-id">
                    App ID
                  </label>
                  <input
                    id="feishu-quick-app-id"
                    className="input"
                    value={feishuDraft.appId}
                    placeholder="cli_xxxxxxxxxxxxxxxx"
                    onChange={(event) =>
                      setFeishuDraft({
                        ...feishuDraft,
                        appId: event.target.value,
                      })
                    }
                  />

                  <label
                    className="field-label"
                    htmlFor="feishu-quick-app-secret"
                  >
                    App Secret
                  </label>
                  <input
                    id="feishu-quick-app-secret"
                    className="input"
                    type="password"
                    value={feishuDraft.appSecret}
                    placeholder={
                      feishuHasSecret
                        ? "已保存，留空则不修改"
                        : "请输入飞书 App Secret"
                    }
                    onChange={(event) =>
                      setFeishuDraft({
                        ...feishuDraft,
                        appSecret: event.target.value,
                      })
                    }
                  />

                  {feishuValidation && !feishuValidation.ok && (
                    <div className="feishu-validation">
                      {feishuValidation.errors.map((error) => (
                        <div key={error}>· {error}</div>
                      ))}
                    </div>
                  )}

                  {feishuNotice && (
                    <p className="feishu-notice">{feishuNotice}</p>
                  )}

                  <div className="feishu-actions">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={
                        feishuSaving ? (
                          <RefreshCw size={12} className="spin" />
                        ) : (
                          <Wifi size={12} />
                        )
                      }
                      disabled={feishuSaving}
                      onClick={() => void connectFeishu()}
                    >
                      {feishuSaving ? "检测中…" : "检测并连接"}
                    </Button>
                  </div>
                </div>

                <div className="feishu-card feishu-quick">
                  <div className="feishu-card-head">
                    <div>
                      <b>2. 手机发一句话</b>
                      <small>
                        用手机飞书私聊机器人，发送「你好」。收到后会自动绑定你的
                        open_id 和 chat_id。
                      </small>
                    </div>
                    <Tag
                      tone={
                        feishuChannel?.state === "online" ? "mint" : "gray"
                      }
                    >
                      {feishuChannel?.state === "online"
                        ? "等待消息"
                        : "未连接"}
                    </Tag>
                  </div>
                  <p className="feishu-hint">
                    私聊没反应时，检查权限
                    <code>im:message.p2p_msg:readonly</code> 和事件
                    <code>im.message.receive_v1</code> 是否已发布。
                  </p>
                </div>
              </div>

              <details className="feishu-advanced">
                <summary>高级设置</summary>
                <div className="feishu-card">
                <div className="feishu-card-head">
                  <div>
                    <b>接入配置</b>
                    <small>
                      填写飞书自建应用凭证，保存后自动建立长连接。
                    </small>
                  </div>
                  <Tag
                    tone={feishuValidation?.ok ? "mint" : "amber"}
                  >
                    {feishuValidation?.ok
                      ? feishuDraft.enabled
                        ? "已配置"
                        : "已配置 · 未启用"
                      : "未完成"}
                  </Tag>
                </div>

                <label className="field-label" htmlFor="feishu-app-id">
                  App ID
                </label>
                <input
                  id="feishu-app-id"
                  className="input"
                  value={feishuDraft.appId}
                  placeholder="cli_xxxxxxxxxxxxxxxx"
                  onChange={(event) =>
                    setFeishuDraft({
                      ...feishuDraft,
                      appId: event.target.value,
                    })
                  }
                />

                <label className="field-label" htmlFor="feishu-app-secret">
                  App Secret
                </label>
                <input
                  id="feishu-app-secret"
                  className="input"
                  type="password"
                  value={feishuDraft.appSecret}
                  placeholder={
                    feishuHasSecret
                      ? "已保存，留空则不修改"
                      : "请输入飞书 App Secret"
                  }
                  onChange={(event) =>
                    setFeishuDraft({
                      ...feishuDraft,
                      appSecret: event.target.value,
                    })
                  }
                />

                <div className="setting-row">
                  <div>
                    <b>自动配对</b>
                    <small>
                      第一次给机器人发消息时，自动绑定你的 open_id 和 chat_id
                    </small>
                  </div>
                  <div className="setting-control">
                    <Switch
                      checked={feishuDraft.autoPair}
                      onChange={() =>
                        setFeishuDraft({
                          ...feishuDraft,
                          autoPair: !feishuDraft.autoPair,
                        })
                      }
                    />
                  </div>
                </div>

                {feishuDraft.autoPair && (
                  <p className="feishu-notice">
                    已开启自动配对：接收 ID 和 Open ID 可以先留空。
                  </p>
                )}

                <label className="field-label" htmlFor="feishu-receive-type">
                  接收 ID 类型
                </label>
                <select
                  id="feishu-receive-type"
                  className="input"
                  value={feishuDraft.receiveIdType}
                  onChange={(event) =>
                    setFeishuDraft({
                      ...feishuDraft,
                      receiveIdType: event.target
                        .value as TesTFeishuConfig["receiveIdType"],
                    })
                  }
                >
                  <option value="chat_id">chat_id（群聊）</option>
                  <option value="open_id">open_id（用户）</option>
                  <option value="user_id">user_id</option>
                  <option value="email">email</option>
                </select>

                <label className="field-label" htmlFor="feishu-receive-id">
                  默认接收 ID
                </label>
                <input
                  id="feishu-receive-id"
                  className="input"
                  value={feishuDraft.receiveId}
                  placeholder="oc_xxx / ou_xxx"
                  onChange={(event) =>
                    setFeishuDraft({
                      ...feishuDraft,
                      receiveId: event.target.value,
                    })
                  }
                />

                <label className="field-label" htmlFor="feishu-open-ids">
                  允许的 Open ID（每行一个）
                </label>
                <textarea
                  id="feishu-open-ids"
                  className="input feishu-textarea"
                  rows={4}
                  value={feishuOpenIdsText}
                  placeholder={"ou_xxxxxxxx\nou_yyyyyyyy"}
                  onChange={(event) =>
                    setFeishuOpenIdsText(event.target.value)
                  }
                />

                <div className="setting-row">
                  <div>
                    <b>允许所有用户</b>
                    <small>不推荐，仅临时调试使用</small>
                  </div>
                  <div className="setting-control">
                    <Switch
                      checked={feishuDraft.allowAll}
                      onChange={() =>
                        setFeishuDraft({
                          ...feishuDraft,
                          allowAll: !feishuDraft.allowAll,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="setting-row">
                  <div>
                    <b>启用飞书通道</b>
                    <small>保存后自动建立长连接并接收机器人消息</small>
                  </div>
                  <div className="setting-control">
                    <Switch
                      checked={feishuDraft.enabled}
                      onChange={() =>
                        setFeishuDraft({
                          ...feishuDraft,
                          enabled: !feishuDraft.enabled,
                        })
                      }
                    />
                  </div>
                </div>

                {feishuValidation && !feishuValidation.ok && (
                  <div className="feishu-validation">
                    {feishuValidation.errors.map((error) => (
                      <div key={error}>· {error}</div>
                    ))}
                  </div>
                )}

                {feishuNotice && (
                  <p className="feishu-notice">{feishuNotice}</p>
                )}

                <div className="feishu-actions">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void loadFeishuConfig()}
                  >
                    <RotateCcw size={12} /> 重新读取
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Save size={12} />}
                    disabled={feishuSaving}
                    onClick={() => void saveFeishuConfig()}
                  >
                    {feishuSaving ? "保存中…" : "保存配置"}
                  </Button>
                </div>

                <p className="remote-note">
                  配置文件：{feishuPath || "保存后显示"}。
                  保存后会自动建立飞书长连接，收到的消息会转给当前 Pi
                  会话，回复也会发回原会话。危险命令审批会同步到飞书，
                  可回复 /approve 或 /deny 处理。
                </p>
              </div>
              </details>
            </TabsPrimitive.Content>

            <TabsPrimitive.Content value="shortcuts" className="tabs-content">
              {shortcuts.map((item) => (
                <div className="shortcut-row" key={item.label}>
                  <span>{item.label}</span>
                  {item.id ? (
                    <input
                      className="shortcut-input"
                      value={
                        shortcutOverrides[item.id] || item.keys.join("+")
                      }
                      onChange={(event) =>
                        setShortcut(item.id!, event.target.value)
                      }
                      placeholder={item.keys.join("+")}
                      title="例如 Ctrl+K、Ctrl+Shift+F"
                    />
                  ) : (
                    <span className="keys">
                      {item.keys.map((key) => (
                        <kbd key={key}>{key}</kbd>
                      ))}
                    </span>
                  )}
                </div>
              ))}
              <SeparatorPrimitive.Root className="sep-line" />
              <p className="shortcut-note">
                快捷键输入格式如 Ctrl+K；留空恢复默认。Enter 发送、Shift + Enter 换行。
              </p>
              {shortcutConflict && (
                <p className="preset-error">{shortcutConflict}</p>
              )}
            </TabsPrimitive.Content>

            <TabsPrimitive.Content value="update" className="tabs-content">
              <section className="update-section">
                <div className="update-section-head">
                  <div>
                    <b>TesT 桌面端</b>
                    <small>GitHub Releases 自动更新</small>
                  </div>
                  <span className="setting-value">
                    {updateStatus?.version || "0.1.0"}
                  </span>
                </div>
                <div className="setting-row">
                  <div>
                    <b>更新状态</b>
                    <small>
                      {updateStatus?.message || "尚未检查更新"}
                    </small>
                  </div>
                  <span className="setting-value">
                    {updateStatus?.percent
                      ? `${updateStatus.percent}%`
                      : updateStatus?.state || "idle"}
                  </span>
                </div>
                <label className="field-label">桌面端更新源</label>
                <input
                  className="input"
                  value={feedUrl}
                  onChange={(event) => setFeedUrl(event.target.value)}
                  placeholder="https://github.com/SgF-123/TesT/releases/latest/download/"
                />
                <div className="update-actions">
                  <Button
                    variant="secondary"
                    icon={<Save size={12} />}
                    onClick={() => onSaveUpdateFeed(feedUrl)}
                    disabled={!feedUrl.trim()}
                  >
                    保存更新源
                  </Button>
                  <Button
                    variant="ghost"
                    icon={<Eraser size={12} />}
                    onClick={onClearUpdateFeed}
                  >
                    恢复默认
                  </Button>
                </div>
                <div className="update-actions">
                  <Button variant="secondary" onClick={onCheckUpdate}>
                    <RotateCcw size={12} /> 检查桌面端更新
                  </Button>
                  {(updateStatus?.state === "available" ||
                    (updateStatus?.state === "error" &&
                      updateStatus?.availableVersion)) && (
                    <Button
                      variant="primary"
                      icon={<Download size={12} />}
                      onClick={onDownloadUpdate}
                    >
                      {updateStatus?.state === "error"
                        ? "重试下载"
                        : "下载更新"}
                    </Button>
                  )}
                  {updateStatus?.state === "downloaded" && (
                    <Button
                      variant="primary"
                      icon={<RefreshCw size={12} />}
                      onClick={onInstallUpdate}
                    >
                      重启并安装
                    </Button>
                  )}
                </div>
                <p className="update-note">
                  下载中断会自动续传并重试；仍失败时可再次点击“重试下载”。
                  <br />
                  当前源：{updateStatus?.feedUrl || "未配置"}
                  <br />
                  默认源为 GitHub Releases；自定义配置写入{" "}
                  <code>%APPDATA%\TesT\update.json</code>
                </p>
              </section>

              <section className="update-section pi-update-section">
                <div className="update-section-head">
                  <div>
                    <b>Pi 内核</b>
                    <small>跟随官方 npm 源 · 单独更新</small>
                  </div>
                  <Tag tone="mint">官方</Tag>
                </div>
                <div className="setting-row">
                  <div>
                    <b>当前内核</b>
                    <small>
                      {piUpdateStatus?.packageName ||
                        "@earendil-works/pi-coding-agent"}
                    </small>
                  </div>
                  <span className="setting-value">
                    {piUpdateStatus?.currentVersion || "—"}
                  </span>
                </div>
                <div className="setting-row">
                  <div>
                    <b>官方最新</b>
                    <small>
                      {piUpdateStatus?.source ||
                        "https://registry.npmjs.org"}
                    </small>
                  </div>
                  <span className="setting-value">
                    {piUpdateStatus?.latestVersion || "未检查"}
                  </span>
                </div>
                <div className="update-actions">
                  <Button
                    variant="secondary"
                    onClick={onCheckPiUpdate}
                    disabled={
                      piUpdateStatus?.state === "checking" ||
                      piUpdateStatus?.state === "downloading" ||
                      piUpdateStatus?.state === "installing"
                    }
                  >
                    <RotateCcw size={12} /> 检查 Pi 更新
                  </Button>
                  {(piUpdateStatus?.state === "available" ||
                    piUpdateStatus?.state === "downloading" ||
                    piUpdateStatus?.state === "installing") && (
                    <Button
                      variant="primary"
                      icon={
                        piUpdateStatus?.state === "downloading" ||
                        piUpdateStatus?.state === "installing" ? (
                          <RefreshCw size={12} className="spin" />
                        ) : (
                          <Download size={12} />
                        )
                      }
                      onClick={onInstallPiUpdate}
                      disabled={
                        piUpdateStatus?.state === "downloading" ||
                        piUpdateStatus?.state === "installing"
                      }
                    >
                      {piUpdateStatus?.state === "downloading"
                        ? `下载中 ${piUpdateStatus.percent ?? 0}%`
                        : piUpdateStatus?.state === "installing"
                          ? "安装中…"
                          : "更新 Pi 内核"}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    icon={<RotateCcw size={12} />}
                    onClick={onRestorePiKernel}
                  >
                    恢复内置内核
                  </Button>
                </div>
                <p className="update-note">
                  {piUpdateStatus?.message ||
                    "Pi 内核独立于桌面端更新，更新后会自动重启 Pi。"}
                  <br />
                  官方源：registry.npmjs.org · 安装到
                  <code>%APPDATA%\TesT\pi-kernel</code>
                </p>
              </section>
            </TabsPrimitive.Content>
          </TabsPrimitive.Root>

          <div className="dialog-foot">
            <div>
              <DialogPrimitive.Close asChild>
                <Button
                  variant="primary"
                  icon={<Check size={13} />}
                  onClick={onSave}
                >
                  完成
                </Button>
              </DialogPrimitive.Close>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export default SettingsDialog;
