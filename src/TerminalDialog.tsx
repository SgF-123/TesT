import { useEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal as XTerm } from "@xterm/xterm";
import {
  Eraser,
  Play,
  Plus,
  RotateCcw,
  Terminal,
  X,
} from "lucide-react";
import { Button } from "./Button";
import { Tooltip } from "./Tooltip";

type TerminalTab = {
  id: string;
  title: string;
  cwd: string;
  generation: number;
};

type TerminalController = {
  clear: () => void;
  fit: () => void;
  focus: () => void;
};

function PtyTerminalPane({
  tab,
  active,
  onController,
}: {
  tab: TerminalTab;
  active: boolean;
  onController: (id: string, controller: TerminalController | null) => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<TerminalController | null>(null);
  const registerRef = useRef(onController);
  registerRef.current = onController;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    const terminal = new XTerm({
      cursorBlink: true,
      fontFamily: "Cascadia Code, Consolas, monospace",
      fontSize: 12,
      lineHeight: 1.25,
      scrollback: 6000,
      theme: {
        background: "#0c100e",
        foreground: "#d7e2da",
        cursor: "#3ddc97",
        cursorAccent: "#0c100e",
        selectionBackground: "#214d3b",
        black: "#0c100e",
        red: "#ff7b72",
        green: "#3ddc97",
        yellow: "#e2b25a",
        blue: "#7db6ef",
        magenta: "#c4a6f5",
        cyan: "#72d6c9",
        white: "#e9eeea",
        brightBlack: "#65716a",
      },
    });
    const fit = new FitAddon();
    terminal.loadAddon(fit);
    terminal.open(host);
    const savedScrollback = localStorage.getItem(
      `tesT.terminalScrollback.${tab.title}`,
    );
    if (savedScrollback) {
      terminal.write(savedScrollback);
    }

    const controller: TerminalController = {
      clear: () => terminal.clear(),
      fit: () => fit.fit(),
      focus: () => terminal.focus(),
    };
    controllerRef.current = controller;
    registerRef.current(tab.id, controller);

    const input = terminal.onData((data) => {
      void window.tesT?.terminalInput?.({ id: tab.id, data });
    });
    const handleOutput = (record: any) => {
      if (record?.id !== tab.id) {
        return;
      }
      if (record.type === "data") {
        terminal.write(record.data || "");
      } else if (record.type === "exit") {
        terminal.write(
          `\r\n\x1b[90m[process exited${
            typeof record.code === "number" ? ` ${record.code}` : ""
          }]\x1b[0m\r\n`,
        );
      } else if (record.type === "error") {
        terminal.write(`\r\n\x1b[31m${record.text || "终端错误"}\x1b[0m\r\n`);
      }
    };
    const unsubscribe = window.tesT?.onTerminalData?.(handleOutput);
    let resizeFrame: number | null = null;
    const resizeObserver = new ResizeObserver(() => {
      if (!active || resizeFrame !== null) {
        return;
      }
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null;
        fit.fit();
        void window.tesT?.terminalResize?.({
          id: tab.id,
          cols: terminal.cols,
          rows: terminal.rows,
        });
      });
    });
    resizeObserver.observe(host);

    requestAnimationFrame(() => {
      fit.fit();
      void window.tesT?.terminalStart?.({
        id: tab.id,
        cwd: tab.cwd,
        cols: terminal.cols,
        rows: terminal.rows,
      });
      if (active) {
        terminal.focus();
      }
    });

    return () => {
      try {
        const buffer = terminal.buffer.active;
        const lines: string[] = [];
        const startLine = Math.max(0, buffer.baseY - 150);
        for (let index = startLine; index < buffer.baseY + buffer.viewportY; index += 1) {
          lines.push(buffer.getLine(index)?.translateToString(true) || "");
        }
        localStorage.setItem(
          `tesT.terminalScrollback.${tab.title}`,
          lines.join("\n"),
        );
      } catch {
        // Scrollback persistence is best-effort.
      }
      if (resizeFrame !== null) {
        cancelAnimationFrame(resizeFrame);
      }
      resizeObserver.disconnect();
      input.dispose();
      if (typeof unsubscribe === "function") {
        unsubscribe();
      } else {
        window.tesT?.offTerminalData?.(handleOutput);
      }
      registerRef.current(tab.id, null);
      controllerRef.current = null;
      void window.tesT?.terminalStop?.({ id: tab.id });
      terminal.dispose();
    };
  }, [tab.id, tab.cwd, tab.generation]);

  useEffect(() => {
    if (!active) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      controllerRef.current?.fit();
      controllerRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [active]);

  return (
    <div
      ref={hostRef}
      className={`pty-host ${active ? "active" : ""}`}
      aria-hidden={!active}
    />
  );
}

function TerminalDialog({
  open,
  onOpenChange,
  cwd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cwd: string;
}) {
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeId, setActiveId] = useState("");
  const restoredTitlesRef = useRef<Array<{ title: string; cwd?: string }>>(
    (() => {
      try {
        const value = JSON.parse(
          localStorage.getItem("tesT.terminalTabTitles") || "[]",
        );
        return Array.isArray(value)
          ? value
              .map((item) =>
                typeof item === "string"
                  ? { title: item }
                  : item && typeof item.title === "string"
                    ? {
                        title: item.title,
                        cwd:
                          typeof item.cwd === "string"
                            ? item.cwd
                            : undefined,
                      }
                    : null,
              )
              .filter(
                (item): item is { title: string; cwd?: string } =>
                  Boolean(item),
              )
          : [];
      } catch {
        return [];
      }
    })(),
  );
  const [scripts, setScripts] = useState<Array<{ name: string; command: string }>>(
    [],
  );
  const [runHistory, setRunHistory] = useState<
    Array<{
      name: string;
      at: number;
      durationMs?: number;
      status?: "running" | "ok" | "fail";
    }>
  >(() => {
    try {
      const value = JSON.parse(
        localStorage.getItem("tesT.scriptRunHistory") || "[]",
      );
      return Array.isArray(value)
        ? value.filter(
            (item) =>
              item &&
              typeof item.name === "string" &&
              typeof item.at === "number",
          )
        : [];
    } catch {
      return [];
    }
  });
  const controllers = useRef(new Map<string, TerminalController>());
  const pendingScriptRef = useRef<{
    id: string;
    name: string;
    startedAt: number;
    buffer: string;
  } | null>(null);

  const createTab = () => {
    const id = `terminal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setTabs((items) => [
      ...items,
      {
        id,
        title: `终端 ${items.length + 1}`,
        cwd,
        generation: 0,
      },
    ]);
    setActiveId(id);
  };

  useEffect(() => {
    if (open && tabs.length === 0) {
      const titles = restoredTitlesRef.current;
      const initial = (
        titles.length ? titles : [{ title: "终端 1" }]
      ).map(
        (item, index) => ({
          id: `terminal-${Date.now()}-${index}-${Math.random()
            .toString(36)
            .slice(2, 7)}`,
          title: item.title,
          cwd: item.cwd || cwd,
          generation: 0,
        }),
      );
      setTabs(initial);
      setActiveId(initial[0]?.id || "");
    }
  }, [open, tabs.length, cwd]);

  useEffect(() => {
    if (tabs.length > 0) {
      localStorage.setItem(
        "tesT.terminalTabTitles",
        JSON.stringify(
          tabs.map((tab) => ({ title: tab.title, cwd: tab.cwd })),
        ),
      );
    }
  }, [tabs]);

  useEffect(() => {
    const listener = (record: any) => {
      const pending = pendingScriptRef.current;
      if (
        !pending ||
        record?.type !== "data" ||
        record.id !== pending.id
      ) {
        return;
      }
      pending.buffer += String(record.data || "");
      const match = /__TSC_DONE__(\d+)/.exec(pending.buffer);
      if (!match) {
        return;
      }
      const status: "ok" | "fail" =
        Number(match[1]) === 0 ? "ok" : "fail";
      const durationMs = Date.now() - pending.startedAt;
      setRunHistory((items) => {
        const next = items.map((item) =>
          item.name === pending.name
            ? { ...item, status, durationMs }
            : item,
        );
        localStorage.setItem("tesT.scriptRunHistory", JSON.stringify(next));
        return next;
      });
      pendingScriptRef.current = null;
    };
    window.tesT?.onTerminalData?.(listener);
    return () => window.tesT?.offTerminalData?.(listener);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setScripts([]);
    if (!open || !cwd || !window.tesT?.readFile) {
      return;
    }
    void window.tesT
      .readFile({ cwd, path: "package.json" })
      .then((result) => {
        if (cancelled || result?.error || !result?.text) {
          return;
        }
        const packageJson = JSON.parse(result.text);
        const entries = Object.entries(packageJson.scripts || {})
          .filter((entry): entry is [string, string] => typeof entry[1] === "string")
          .map(([name, command]) => ({ name, command }))
          .slice(0, 8);
        if (!cancelled) {
          setScripts(entries);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, cwd]);

  const closeTab = (id: string) => {
    controllers.current.delete(id);
    setTabs((items) => {
      const index = items.findIndex((item) => item.id === id);
      const next = items.filter((item) => item.id !== id);
      if (activeId === id) {
        setActiveId(next[Math.max(0, index - 1)]?.id || next[0]?.id || "");
      }
      return next;
    });
  };

  const activeTab = tabs.find((tab) => tab.id === activeId) || tabs[0];

  const send = (data: string) => {
    if (!activeTab) {
      return;
    }
    void window.tesT?.terminalInput?.({ id: activeTab.id, data });
  };

  const recordScriptRun = (name: string) => {
    setRunHistory((items) => {
      const next = [
        {
          name,
          at: Date.now(),
          status: "running" as const,
          durationMs: 0,
        },
        ...items,
      ]
        .filter(
          (item, index, list) =>
            list.findIndex(
              (candidate) => candidate.name === item.name,
            ) === index,
        )
        .slice(0, 8);
      localStorage.setItem("tesT.scriptRunHistory", JSON.stringify(next));
      return next;
    });
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="rx-overlay" />
        <DialogPrimitive.Content className="dialog terminal-dialog">
          <div className="dialog-head">
            <div>
              <DialogPrimitive.Title className="dialog-title">
                终端
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="dialog-desc">
                PTY · {cwd || "未选择工作区"} · {tabs.length} 个标签
              </DialogPrimitive.Description>
            </div>
            <div className="file-head-actions">
              <Tooltip tip="重启当前终端">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<RotateCcw size={12} />}
                  disabled={!activeTab}
                  onClick={() => {
                    if (!activeTab) return;
                    setTabs((items) =>
                      items.map((item) =>
                        item.id === activeTab.id
                          ? { ...item, generation: item.generation + 1 }
                          : item,
                      ),
                    );
                  }}
                >
                  重启
                </Button>
              </Tooltip>
              <Tooltip tip="清空当前终端">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Eraser size={12} />}
                  disabled={!activeTab}
                  onClick={() =>
                    activeTab && controllers.current.get(activeTab.id)?.clear()
                  }
                >
                  清屏
                </Button>
              </Tooltip>
              <DialogPrimitive.Close asChild>
                <Button variant="icon" aria-label="关闭">
                  <X size={15} />
                </Button>
              </DialogPrimitive.Close>
            </div>
          </div>
          <div className="terminal-tabs">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                data-terminal-id={tab.id}
                className={`terminal-tab ${tab.id === activeTab?.id ? "on" : ""}`}
              >
                <button
                  type="button"
                  className="terminal-tab-main"
                  onClick={() => setActiveId(tab.id)}
                  onDoubleClick={() => {
                    const title = window.prompt("终端标签名称", tab.title);
                    if (!title?.trim()) {
                      return;
                    }
                    setTabs((items) =>
                      items.map((item) =>
                        item.id === tab.id
                          ? { ...item, title: title.trim() }
                          : item,
                      ),
                    );
                  }}
                >
                  <Terminal size={11} />
                  {tab.title}
                </button>
                <button
                  type="button"
                  className="terminal-tab-close"
                  aria-label={`关闭 ${tab.title}`}
                  onClick={() => closeTab(tab.id)}
                >
                  <X size={9} />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="terminal-tab-new"
              aria-label="新建终端标签"
              title="新建终端标签"
              onClick={createTab}
            >
              <Plus size={12} />
            </button>
          </div>
          {scripts.length > 0 && (
            <div className="terminal-scripts">
              <span className="terminal-scripts-label">脚本</span>
              {scripts.map((script) => (
                <button
                  key={script.name}
                  type="button"
                  title={script.command}
                  onClick={() => {
                    recordScriptRun(script.name);
                    if (activeTab) {
                      pendingScriptRef.current = {
                        id: activeTab.id,
                        name: script.name,
                        startedAt: Date.now(),
                        buffer: "",
                      };
                    }
                    send(
                      `cmd /v:on /d /s /c "npm run ${script.name} & echo __TSC_DONE__!errorlevel!"\r`,
                    );
                  }}
                >
                  <Play size={10} />
                  {script.name}
                </button>
              ))}
            </div>
          )}
          <div className="terminal-panes">
            {tabs.map((tab) => (
              <PtyTerminalPane
                key={`${tab.id}-${tab.generation}`}
                tab={tab}
                active={tab.id === activeTab?.id}
                onController={(id, controller) => {
                  if (controller) {
                    controllers.current.set(id, controller);
                  } else {
                    controllers.current.delete(id);
                  }
                }}
              />
            ))}
          </div>
          <div className="dialog-foot">
            <span className="muted">
              完整 PTY · 支持 ANSI / TUI · 命令在当前工作区执行
            </span>
            <span className="muted">
              {runHistory.length > 0
                ? `最近运行：${runHistory
                    .slice(0, 3)
                    .map(
                      (item) =>
                        `${item.status === "ok" ? "✓" : item.status === "fail" ? "✗" : "…"} ${item.name} ${new Date(item.at).toLocaleTimeString(
                          "zh-CN",
                          { hour: "2-digit", minute: "2-digit" },
                        )}`,
                    )
                    .join(" · ")}`
                : "Ctrl+C 可中断当前程序"}
            </span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export { TerminalDialog };
