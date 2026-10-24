import { useEffect, useMemo, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as SelectPrimitive from "@radix-ui/react-select";
import {
  ChevronDown,
  ChevronRight,
  Globe,
  Search,
  X,
} from "lucide-react";
import { Button } from "./Button";
import { Checkbox } from "./form-controls";
import { LoadingRing } from "./Loading";
import { Tag } from "./Tag";

export type CatalogModel = {
  id: string;
  name: string;
  provider: string;
  providerName: string;
  contextWindow: number | null;
  reasoning: boolean;
  available: boolean;
};

export type CatalogProvider = {
  id: string;
  name: string;
  available: boolean;
  modelCount: number;
};

function ModelBrowserDialog({
  open,
  onOpenChange,
  onSelect,
  onNotify,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (model: CatalogModel) => void;
  onNotify: (title: string, desc?: string) => void;
}) {
  const bridge = window.tesT;
  const [models, setModels] = useState<CatalogModel[]>([]);
  const [providers, setProviders] = useState<CatalogProvider[]>([]);
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState("all");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const notifyRef = useRef(onNotify);
  notifyRef.current = onNotify;

  useEffect(() => {
    if (!open) {
      return;
    }
    setLoading(true);
    setError("");

    const request = bridge?.listModelCatalog?.();
    request
      ?.then((result) => {
        if (result?.error) {
          setError(result.error);
          return;
        }
        setModels(result?.models || []);
        setProviders(result?.providers || []);
      })
      .catch((reason) => setError(String(reason)))
      .finally(() => setLoading(false));
  }, [open, bridge]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return models.filter((model) => {
      if (provider !== "all" && model.provider !== provider) {
        return false;
      }
      if (onlyAvailable && !model.available) {
        return false;
      }
      if (!needle) {
        return true;
      }
      return [model.id, model.name, model.provider, model.providerName]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [models, provider, onlyAvailable, query]);

  const groups = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        available: boolean;
        models: CatalogModel[];
      }
    >();

    for (const item of filtered) {
      let group = map.get(item.provider);
      if (!group) {
        group = {
          id: item.provider,
          name: item.providerName,
          available: item.available,
          models: [],
        };
        map.set(item.provider, group);
      }
      group.available = group.available || item.available;
      group.models.push(item);
    }

    return [...map.values()].sort(
      (a, b) =>
        Number(b.available) - Number(a.available) ||
        a.name.localeCompare(b.name),
    );
  }, [filtered]);

  const availableTotal = useMemo(
    () => models.filter((item) => item.available).length,
    [models],
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="rx-overlay" />
        <DialogPrimitive.Content className="dialog model-browser-dialog">
          <div className="dialog-head">
            <div>
              <DialogPrimitive.Title className="dialog-title">
                全部模型
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="dialog-desc">
                Pi 内置目录 · {availableTotal} 个可用 / 共 {models.length} 个 ·{" "}
                {providers.length} 个 Provider
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="icon" aria-label="关闭">
                <X size={15} />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <div className="preset-toolbar">
            <div className="search preset-search">
              <Search size={14} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索模型、Provider…"
              />
            </div>
            <span className="preset-count">
              {loading ? (
                <span className="inline-loading">
                  <LoadingRing /> 加载中…
                </span>
              ) : (
                `${filtered.length} / ${models.length} 个`
              )}
            </span>
          </div>

          <div className="model-browser-filters">
            <SelectPrimitive.Root value={provider} onValueChange={setProvider}>
              <SelectPrimitive.Trigger className="select-trigger">
                <span className="select-trigger-value">
                  <Globe size={12} />
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
                    <SelectPrimitive.Item
                      value="all"
                      className="select-item"
                    >
                      <SelectPrimitive.ItemText>
                        全部 Provider
                      </SelectPrimitive.ItemText>
                    </SelectPrimitive.Item>
                    {providers.map((item) => (
                      <SelectPrimitive.Item
                        key={item.id}
                        value={item.id}
                        className="select-item"
                      >
                        <SelectPrimitive.ItemText>
                          {item.name} · {item.modelCount}
                        </SelectPrimitive.ItemText>
                      </SelectPrimitive.Item>
                    ))}
                  </SelectPrimitive.Viewport>
                </SelectPrimitive.Content>
              </SelectPrimitive.Portal>
            </SelectPrimitive.Root>
            <label className="model-browser-toggle">
              <Checkbox
                checked={onlyAvailable}
                onChange={() => setOnlyAvailable((value) => !value)}
              />
              仅显示可用模型
            </label>
          </div>

          {error && <p className="preset-error">{error}</p>}

          <div className="model-browser-list">
            {groups.map((group) => (
              <div className="model-browser-group" key={group.id}>
                <div className="model-browser-group-head">
                  <span className="model-browser-group-name">
                    {group.name}
                  </span>
                  <span className="model-browser-group-meta">
                    {group.id} · {group.models.length} 个
                  </span>
                  <Tag tone={group.available ? "mint" : "amber"}>
                    {group.available ? "已配置" : "需登录"}
                  </Tag>
                </div>
                {group.models.map((item) => (
                  <button type="button"
                    key={`${item.provider}:${item.id}`}
                    className={`model-browser-row ${
                      item.available ? "" : "locked"
                    }`}
                    onClick={() => {
                      if (!item.available) {
                        notifyRef.current(
                          "需要先登录",
                          `${item.providerName} 还没有配置`,
                        );
                        return;
                      }
                      onSelect(item);
                      onOpenChange(false);
                    }}
                  >
                    <span className="model-browser-main">
                      <b>{item.name}</b>
                      <small>
                        {item.provider} · {item.id}
                      </small>
                    </span>
                    <span className="model-browser-side">
                      {item.contextWindow ? (
                        <span>
                          {item.contextWindow >= 1_000_000
                            ? `${Math.round(item.contextWindow / 1_000_000)}M`
                            : `${Math.round(item.contextWindow / 1_000)}k`}
                        </span>
                      ) : null}
                      <Tag tone={item.available ? "mint" : "amber"}>
                        {item.available ? "可用" : "需登录"}
                      </Tag>
                      <ChevronRight size={12} />
                    </span>
                  </button>
                ))}
              </div>
            ))}
            {!loading && filtered.length === 0 && (
              <div className="preset-empty">没有匹配的模型</div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export default ModelBrowserDialog;
