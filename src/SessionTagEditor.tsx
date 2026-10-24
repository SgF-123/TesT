import { useState } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Check, Plus, Tag as TagIcon } from "lucide-react";
import {
  assignedTagsForPath,
  type SessionTagStore,
} from "./session-tags";

type SessionTagEditorProps = {
  store: SessionTagStore;
  path: string;
  onToggle: (tagId: string) => void;
  onCreate: (name: string) => void;
  onClear: () => void;
};

export default function SessionTagEditor({
  store,
  path,
  onToggle,
  onCreate,
  onClear,
}: SessionTagEditorProps) {
  const [query, setQuery] = useState("");
  const assigned = assignedTagsForPath(store, path);
  const assignedIds = new Set(assigned.map((tag) => tag.id));

  const create = () => {
    const name = query.replace(/\s+/g, " ").trim();
    if (!name) return;
    onCreate(name);
    setQuery("");
  };

  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          className={`tree-session-tag-quick ${
            assigned.length ? "has-tags" : ""
          }`}
          title="管理会话标签"
          aria-label="管理会话标签"
          onClick={(event) => event.stopPropagation()}
        >
          <TagIcon size={11} />
          {assigned.length > 0 && <b>{assigned.length}</b>}
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className="tag-editor-content"
          side="right"
          align="start"
          sideOffset={8}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <div className="tag-editor-head">
            <span>
              <TagIcon size={12} />
              会话标签
            </span>
            {assigned.length > 0 && (
              <button type="button" onClick={onClear}>
                清除
              </button>
            )}
          </div>

          <label className="tag-editor-create">
            <Plus size={12} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  create();
                }
              }}
              placeholder="输入新标签，回车创建"
              aria-label="新建会话标签"
            />
          </label>

          <div className="tag-editor-list">
            {store.tags.length > 0 ? (
              store.tags.map((tag) => {
                const checked = assignedIds.has(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    className="tag-editor-row"
                    data-checked={checked ? "true" : undefined}
                    onClick={() => onToggle(tag.id)}
                  >
                    <i
                      className={`session-tag-dot session-tag-color-${tag.color}`}
                    />
                    <span>{tag.name}</span>
                    {checked && <Check size={11} />}
                  </button>
                );
              })
            ) : (
              <p className="tag-editor-empty">还没有标签，输入名称创建</p>
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
