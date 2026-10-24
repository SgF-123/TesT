import { useEffect, useMemo, useState } from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Copy,
  FileText,
  FolderOpen,
  Link2,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "./Button";
import { copyText } from "./clipboard";
import { formatBytes } from "./format";

export default function FileBrowserDialog({
  open,
  onOpenChange,
  cwd,
  onNotify,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cwd: string;
  onNotify: (title: string, desc?: string) => void;
}) {
  const [entries, setEntries] = useState<
    { path: string; name: string; size: number }[]
  >([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const [content, setContent] = useState<{
    text: string;
    binary: boolean;
    size: number;
    error?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setQuery("");
    setSelected("");
    setContent(null);
    if (!window.tesT?.listFiles) {
      setEntries([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void window.tesT
      .listFiles({ cwd })
      .then((result) => {
        if (cancelled) {
          return;
        }
        if (result?.error) {
          onNotify("读取文件列表失败", result.error);
        }
        setEntries(Array.isArray(result?.files) ? result.files : []);
        setTruncated(Boolean(result?.truncated));
      })
      .catch((error) => onNotify("读取文件列表失败", String(error)))
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, cwd, reloadToken]);

  const openFile = (path: string) => {
    setSelected(path);
    setContent(null);
    if (!window.tesT?.readFile) {
      return;
    }
    setLoading(true);
    void window.tesT
      .readFile({ cwd, path })
      .then((result) => {
        if (result?.error) {
          setContent({
            text: "",
            binary: false,
            size: result.size || 0,
            error: result.error,
          });
          return;
        }
        setContent({
          text: result.text || "",
          binary: Boolean(result.binary),
          size: result.size || 0,
        });
      })
      .catch((error) =>
        setContent({
          text: "",
          binary: false,
          size: 0,
          error: String(error),
        }),
      )
      .finally(() => setLoading(false));
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = needle
      ? entries.filter((entry) =>
          entry.path.toLowerCase().includes(needle),
        )
      : entries;
    return list.slice(0, 400);
  }, [entries, query]);

  const deleteSelected = async () => {
    if (!selected || deleteBusy || !window.tesT?.deletePath) {
      return;
    }
    setDeleteBusy(true);
    try {
      const result = await window.tesT.deletePath({ cwd, path: selected });
      if (result?.error) {
        onNotify("删除失败", result.error);
        return;
      }
      onNotify("文件已删除", selected);
      setDeleteOpen(false);
      setSelected("");
      setContent(null);
      setReloadToken((value) => value + 1);
    } catch (error) {
      onNotify("删除失败", String(error));
    } finally {
      setDeleteBusy(false);
    }
  };

  const deleteDirectory = async () => {
    if (!window.tesT?.chooseDeleteDirectory) {
      onNotify("无法删除文件夹", "当前环境不支持此操作");
      return;
    }
    try {
      const result = await window.tesT.chooseDeleteDirectory({ cwd });
      if (result?.canceled) {
        return;
      }
      if (result?.error) {
        onNotify("删除文件夹失败", result.error);
        return;
      }
      if (result?.removed) {
        onNotify("文件夹已删除", result.path || "");
        setSelected("");
        setContent(null);
        setReloadToken((value) => value + 1);
      }
    } catch (error) {
      onNotify("删除文件夹失败", String(error));
    }
  };

  return (
    <>
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="rx-overlay" />
        <DialogPrimitive.Content className="dialog file-dialog">
          <div className="dialog-head">
            <div>
              <DialogPrimitive.Title className="dialog-title">
                工作区文件
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="dialog-desc">
                {cwd || "未选择工作区"} · {entries.length} 个文件
                {truncated ? "（已截断）" : ""}
              </DialogPrimitive.Description>
            </div>
            <div className="file-head-actions">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void deleteDirectory()}
              >
                <Trash2 size={12} /> 删除文件夹
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (window.tesT?.revealPath) {
                    void window.tesT.revealPath({ cwd, path: "." });
                  }
                }}
              >
                <FolderOpen size={12} /> 打开目录
              </Button>
              <DialogPrimitive.Close asChild>
                <Button variant="icon" aria-label="关闭">
                  <X size={15} />
                </Button>
              </DialogPrimitive.Close>
            </div>
          </div>
          <div className="file-toolbar">
            <Search size={13} />
            <input
              className="input"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="按路径筛选…"
            />
          </div>
          <div className="file-split">
            <div className="file-list">
              {loading && entries.length === 0 && (
                <div className="file-empty">正在扫描工作区…</div>
              )}
              {!loading && filtered.length === 0 && (
                <div className="file-empty">没有匹配的文件</div>
              )}
              {filtered.map((entry) => (
                <button type="button"
                  key={entry.path}
                  className={`file-item ${
                    selected === entry.path ? "active" : ""
                  }`}
                  onClick={() => openFile(entry.path)}
                  title={entry.path}
                >
                  <FileText size={12} />
                  <span>{entry.path}</span>
                  <small>{formatBytes(entry.size)}</small>
                </button>
              ))}
            </div>
            <div className="file-preview">
              {!selected && (
                <div className="file-empty">
                  选择左侧文件查看内容
                </div>
              )}
              {selected && (
                <>
                  <div className="file-preview-head">
                    <code>{selected}</code>
                    <div>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!content?.text}
                        onClick={async () => {
                          if (content?.text) {
                            const ok = await copyText(content.text);
                            if (ok) {
                              onNotify("已复制文件内容");
                            }
                          }
                        }}
                      >
                        <Copy size={11} /> 复制
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteOpen(true)}
                      >
                        <Trash2 size={11} /> 删除
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (window.tesT?.openPath) {
                            void window.tesT.openPath({
                              cwd,
                              path: selected,
                            });
                          }
                        }}
                      >
                        <Link2 size={11} /> 外部打开
                      </Button>
                    </div>
                  </div>
                  {loading ? (
                    <div className="file-empty">读取中…</div>
                  ) : content?.error ? (
                    <div className="file-empty">{content.error}</div>
                  ) : content?.binary ? (
                    <div className="file-empty">
                      二进制文件 · {formatBytes(content.size)} · 不在应用内预览
                    </div>
                  ) : (
                    <pre className="file-code">{content?.text || ""}</pre>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="dialog-foot">
            <span className="muted">
              可预览和删除 · 最多 4000 个文件 · 跳过 node_modules / .git
            </span>
            <DialogPrimitive.Close asChild>
              <Button variant="primary" icon={<X size={13} />}>
                关闭
              </Button>
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <AlertDialogPrimitive.Root
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      >
        <AlertDialogPrimitive.Portal>
          <AlertDialogPrimitive.Overlay className="rx-overlay" />
          <AlertDialogPrimitive.Content className="dialog small">
            <div className="dialog-head">
              <div>
                <AlertDialogPrimitive.Title className="dialog-title">
                  删除这个文件？
                </AlertDialogPrimitive.Title>
                <AlertDialogPrimitive.Description className="dialog-desc">
                  {selected}
                </AlertDialogPrimitive.Description>
              </div>
            </div>
            <div className="dialog-body alert-body">
              <p className="muted">文件会从工作区永久删除，此操作不可撤销。</p>
            </div>
            <div className="dialog-foot">
              <div>
                <AlertDialogPrimitive.Cancel asChild>
                  <Button variant="secondary" icon={<X size={13} />}>
                    取消
                  </Button>
                </AlertDialogPrimitive.Cancel>
                <AlertDialogPrimitive.Action asChild>
                  <Button
                    variant="danger"
                    icon={<Trash2 size={13} />}
                    disabled={deleteBusy}
                    onClick={(event) => {
                      event.preventDefault();
                      void deleteSelected();
                    }}
                  >
                    {deleteBusy ? "删除中…" : "删除"}
                  </Button>
                </AlertDialogPrimitive.Action>
              </div>
            </div>
          </AlertDialogPrimitive.Content>
        </AlertDialogPrimitive.Portal>
      </AlertDialogPrimitive.Root>
    </>
  );
}
