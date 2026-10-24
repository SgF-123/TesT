import { useEffect, useRef, useState, type ReactNode } from "react";
import { Search } from "lucide-react";

export type CommandAction = {
  label: string;
  hint: string;
  icon: ReactNode;
  run: () => void;
};

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: CommandAction[];
};

export function CommandPalette({
  open,
  onOpenChange,
  commands,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const filtered = commands.filter((command) =>
    command.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    setQuery("");
    setIndex(0);
  }, [open]);

  useEffect(() => {
    setIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) {
      return;
    }
    itemRefs.current[index]?.scrollIntoView({ block: "nearest" });
  }, [index, open, query]);

  if (!open) {
    return null;
  }

  const run = (command: CommandAction) => {
    command.run();
    onOpenChange(false);
  };

  return (
    <div className="cmd-overlay" onMouseDown={() => onOpenChange(false)}>
      <div className="cmd" onMouseDown={(event) => event.stopPropagation()}>
        <div className="cmd-input">
          <Search size={15} />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                onOpenChange(false);
                return;
              }
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setIndex((value) =>
                  Math.min(value + 1, filtered.length - 1),
                );
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setIndex((value) => Math.max(value - 1, 0));
              } else if (event.key === "Enter") {
                const command = filtered[index];
                if (command) {
                  run(command);
                }
              }
            }}
            placeholder="输入命令或搜索…"
          />
          <kbd>Esc</kbd>
        </div>
        <div className="cmd-list">
          <div className="cmd-group">操作</div>
          {filtered.map((command, itemIndex) => (
            <button
              type="button"
              key={command.label}
              ref={(node) => {
                itemRefs.current[itemIndex] = node;
              }}
              className={`cmd-item ${itemIndex === index ? "active" : ""}`}
              onMouseEnter={() => setIndex(itemIndex)}
              onClick={() => run(command)}
            >
              <span className="cmd-icon">{command.icon}</span>
              <span>{command.label}</span>
              <span className="cmd-hint">{command.hint}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="cmd-empty">没有匹配的命令</div>
          )}
        </div>
        <div className="cmd-foot">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> 选择
          </span>
          <span>
            <kbd>↵</kbd> 执行
          </span>
        </div>
      </div>
    </div>
  );
}
