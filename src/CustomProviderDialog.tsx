import { useEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as SelectPrimitive from "@radix-ui/react-select";
import {
  Check,
  ChevronDown,
  Package,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { Button } from "./Button";
import {
  LOCAL_PROVIDER_PRESETS,
  PROVIDER_API_OPTIONS,
} from "./provider-presets";

function CustomProviderDialog({
  open,
  onOpenChange,
  onNotify,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNotify: (title: string, desc?: string) => void;
  onSaved: () => void;
}) {
  const bridge = window.tesT;
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [api, setApi] = useState("openai-completions");
  const [apiKey, setApiKey] = useState("");
  const [models, setModels] = useState("");
  const [fetching, setFetching] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [error, setError] = useState("");
  const requestId = useRef("");
  const notifyRef = useRef(onNotify);
  notifyRef.current = onNotify;
  const savedRef = useRef(onSaved);
  savedRef.current = onSaved;

  useEffect(() => {
    if (!open || !bridge?.isShell) {
      return;
    }

    const listener = (record: any) => {
      if (
        record.type !== "models_fetched" ||
        record.requestId !== requestId.current
      ) {
        return;
      }

      setFetching(false);
      if (record.error) {
        setLatency(null);
        setError(String(record.error));
        return;
      }

      const ids = (Array.isArray(record.models) ? record.models : [])
        .map((item: any) => String(item?.id || "").trim())
        .filter(Boolean);
      setModels(ids.join("\n"));
      setLatency(typeof record.ms === "number" ? record.ms : null);
      notifyRef.current(
        `已拉取 ${ids.length} 个模型`,
        typeof record.ms === "number" ? `${record.ms} ms` : undefined,
      );
    };

    bridge.onRecord(listener);
    return () => bridge.offRecord?.(listener);
  }, [open, bridge]);

  const close = () => {
    onOpenChange(false);
    setError("");
    setFetching(false);
  };

  const fetchModels = (override?: {
    baseUrl: string;
    api: string;
    apiKey: string;
  }) => {
    const targetBaseUrl = override?.baseUrl || baseUrl;
    const targetApi = override?.api || api;
    const targetApiKey = override?.apiKey || apiKey;
    if (!bridge?.isShell || !targetBaseUrl.trim() || !targetApiKey.trim()) {
      setError("请先填写 Base URL 和 API Key");
      return;
    }

    const id = `custom-models-${Date.now()}`;
    requestId.current = id;
    setFetching(true);
    setLatency(null);
    setError("");
    void bridge.fetchModels({
      requestId: id,
      baseUrl: targetBaseUrl.trim(),
      api: targetApi,
      apiKey: targetApiKey.trim(),
    });
  };

  const save = () => {
    const modelList = models
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (!name.trim() || !baseUrl.trim() || !apiKey.trim()) {
      setError("渠道名称、Base URL 和 API Key 都必须填写");
      return;
    }
    if (modelList.length === 0) {
      setError("至少填写一个模型 ID");
      return;
    }

    const request = bridge?.saveProvider?.({
      key: `custom-${Date.now()}`,
      name: name.trim(),
      baseUrl: baseUrl.trim(),
      api,
      apiKey: apiKey.trim(),
      models: modelList.map((id) => ({ id, name: id })),
    });
    request?.then((result) => {
        if (result?.error) {
          setError(result.error);
          return;
        }
        notifyRef.current("渠道已添加", name.trim());
        savedRef.current();
        close();
      });
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="rx-overlay" />
        <DialogPrimitive.Content className="dialog custom-provider-dialog">
          <div className="dialog-head">
            <div>
              <DialogPrimitive.Title className="dialog-title">
                添加自定义 Provider
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="dialog-desc">
                写入 Pi 的 models.json · 支持 OpenAI / Anthropic / Gemini
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="icon" aria-label="关闭">
                <X size={15} />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <div className="dialog-body custom-provider-body">
            <div className="provider-presets">
              <span>本地预设</span>
              {LOCAL_PROVIDER_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    setName(preset.name);
                    setBaseUrl(preset.baseUrl);
                    setApi(preset.api);
                    setApiKey(preset.apiKey);
                    setModels("");
                    setError("");
                    fetchModels({
                      baseUrl: preset.baseUrl,
                      api: preset.api,
                      apiKey: preset.apiKey,
                    });
                  }}
                >
                  {preset.name}
                </button>
              ))}
            </div>
            <label className="field-label">渠道名称</label>
            <input
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="例如 我的中转站"
            />

            <label className="field-label">Base URL</label>
            <input
              className="input"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder="https://api.example.com/v1"
            />

            <label className="field-label">API 类型</label>
            <SelectPrimitive.Root value={api} onValueChange={setApi}>
              <SelectPrimitive.Trigger className="select-trigger">
                <span className="select-trigger-value">
                  <Package size={12} />
                  <SelectPrimitive.Value />
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
                    {PROVIDER_API_OPTIONS.map((item) => (
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
                  </SelectPrimitive.Viewport>
                </SelectPrimitive.Content>
              </SelectPrimitive.Portal>
            </SelectPrimitive.Root>

            <label className="field-label">API Key</label>
            <input
              className="input"
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="sk-..."
            />

            <div className="custom-provider-models">
              <div>
                <b>模型 ID</b>
                <small>每行一个，或自动拉取</small>
              </div>
              <Button
                variant="secondary"
                onClick={() => fetchModels()}
                disabled={fetching}
              >
                <RotateCcw size={12} />
                {fetching ? "拉取中…" : "自动拉取"}
              </Button>
            </div>
  {latency !== null && (
    <p className="provider-check">
      检测通过 · {latency} ms · 已写入模型列表
    </p>
  )}
            <textarea
              className="input custom-provider-textarea"
              value={models}
              onChange={(event) => setModels(event.target.value)}
              rows={5}
              placeholder={"gpt-5.1-codex\nclaude-sonnet-4-5"}
            />

            {error && <p className="preset-error">{error}</p>}
          </div>

          <div className="dialog-foot">
            <span className="muted">
              Key 只写入本机 models.json
            </span>
            <div>
              <Button
                variant="secondary"
                icon={<X size={12} />}
                onClick={close}
              >
                取消
              </Button>
              <Button variant="primary" onClick={save}>
                <Plus size={12} /> 保存 Provider
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export default CustomProviderDialog;
