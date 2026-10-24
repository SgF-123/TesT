import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  GitBranch,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "./Button";
import { Tag } from "./Tag";

type BranchInfo = {
  repo: boolean;
  branch: string | null;
  branches: string[];
};

type BranchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cwd: string;
  branches: string[];
  current: string;
  onChanged: (info: BranchInfo) => void;
  onCheckout: (branch: string) => void;
  onNotify: (title: string, desc?: string) => void;
};

export default function BranchDialog({
  open,
  onOpenChange,
  cwd,
  branches,
  current,
  onChanged,
  onCheckout,
  onNotify,
}: BranchDialogProps) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState("");

  useEffect(() => {
    if (open) {
      setName("");
      setPendingDelete("");
      setBusy(false);
    }
  }, [open]);

  const create = () => {
    const value = name.trim();
    if (!value || !window.tesT?.gitBranchCreate) {
      return;
    }
    setBusy(true);
    void window.tesT
      .gitBranchCreate({ cwd, branch: value })
      .then((result) => {
        if (result?.error) {
          onNotify("创建分支失败", result.error);
          return;
        }
        if (result.info) {
          onChanged(result.info);
        }
        onNotify("分支已创建", value);
        setName("");
      })
      .catch((error) => onNotify("创建分支失败", String(error)))
      .finally(() => setBusy(false));
  };

  const remove = (branch: string) => {
    if (!window.tesT?.gitBranchDelete) {
      return;
    }
    if (pendingDelete !== branch) {
      setPendingDelete(branch);
      return;
    }
    setPendingDelete("");
    setBusy(true);
    void window.tesT
      .gitBranchDelete({ cwd, branch })
      .then((result) => {
        if (result?.error) {
          onNotify("删除分支失败", result.error);
          return;
        }
        if (result.info) {
          onChanged(result.info);
        }
        onNotify("分支已删除", branch);
      })
      .catch((error) => onNotify("删除分支失败", String(error)))
      .finally(() => setBusy(false));
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="rx-overlay" />
        <DialogPrimitive.Content className="dialog small branch-dialog">
          <div className="dialog-head">
            <div>
              <DialogPrimitive.Title className="dialog-title">
                分支
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="dialog-desc">
                {cwd || "未选择工作区"} · 当前 {current || "—"}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="icon" aria-label="关闭">
                <X size={15} />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <div className="dialog-body branch-body">
            <div className="branch-create">
              <input
                className="input"
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    create();
                  }
                }}
                placeholder="新分支名，例如 feat/composer"
              />
              <Button
                variant="primary"
                size="sm"
                disabled={busy || !name.trim()}
                onClick={create}
              >
                <Plus size={12} /> 创建
              </Button>
            </div>
            <div className="branch-list">
              {branches.map((branch) => (
                <div
                  key={branch}
                  className={`branch-row ${
                    branch === current ? "current" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="branch-name"
                    onClick={() => {
                      onCheckout(branch);
                      onOpenChange(false);
                    }}
                  >
                    <GitBranch size={12} />
                    <span>{branch}</span>
                    {branch === current && <Tag tone="mint">当前</Tag>}
                  </button>
                  {branch !== current && (
                    <Button
                      variant={pendingDelete === branch ? "danger" : "ghost"}
                      size="sm"
                      icon={<Trash2 size={12} />}
                      disabled={busy}
                      onClick={() => remove(branch)}
                    >
                      {pendingDelete === branch ? "确认删除" : "删除"}
                    </Button>
                  )}
                </div>
              ))}
              {branches.length === 0 && (
                <div className="file-empty">当前工作区不是 Git 仓库</div>
              )}
            </div>
          </div>
          <div className="dialog-foot">
            <span className="muted">git checkout / branch</span>
            <DialogPrimitive.Close asChild>
              <Button variant="secondary" icon={<X size={13} />}>
                关闭
              </Button>
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
