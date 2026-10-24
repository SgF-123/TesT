import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { X } from "lucide-react";
import { Button } from "./Button";
import ContextCards from "./ContextCards";
import type { GitChange } from "./git-types";
import type { Model } from "./settings-config";
import type { SessionStats } from "./usage";

type ContextSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: Model;
  branch: string;
  branches: string[];
  live: boolean;
  stats: SessionStats | null;
  contextTokens: number;
  sessionPath: string;
  cwd?: string;
  onBranch: (value: string) => void;
  gitRepo: boolean;
  budget: number;
  changes: GitChange[];
  onRefreshChanges: () => void;
  onOpenDiff: (change: GitChange) => void;
  onCommit: () => void;
  onOpenFiles: () => void;
  onManageBranches: () => void;
  onConfigureModel: () => void;
};

export function ContextSheet({
  open,
  onOpenChange,
  model,
  branch,
  branches,
  live,
  stats,
  contextTokens,
  sessionPath,
  cwd,
  onBranch,
  gitRepo,
  budget,
  changes,
  onRefreshChanges,
  onOpenDiff,
  onCommit,
  onOpenFiles,
  onManageBranches,
  onConfigureModel,
}: ContextSheetProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="rx-overlay context-overlay" />
        <DialogPrimitive.Content
          className="sheet context-sheet-dialog"
          tabIndex={-1}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            (event.currentTarget as HTMLElement).focus();
          }}
        >
          <div className="sheet-head">
            <div>
              <DialogPrimitive.Title className="sheet-title">
                上下文
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="sheet-desc">
                模型、工作区、改动与扩展
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="icon" aria-label="关闭">
                <X size={15} />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <ScrollAreaPrimitive.Root className="scroll-area">
            <ScrollAreaPrimitive.Viewport className="scroll-area-viewport">
              <div className="sheet-body context-sheet">
                <ContextCards
                  model={model}
                  branch={branch}
                  branches={branches}
                  live={live}
                  stats={stats}
                  contextTokens={contextTokens}
                  sessionPath={sessionPath}
                  cwd={cwd}
                  onBranch={onBranch}
                  gitRepo={gitRepo}
                  budget={budget}
                  changes={changes}
                  onRefreshChanges={onRefreshChanges}
                  onOpenDiff={onOpenDiff}
                  onCommit={onCommit}
                  onOpenFiles={onOpenFiles}
                  onManageBranches={onManageBranches}
                  onConfigureModel={onConfigureModel}
                />
              </div>
            </ScrollAreaPrimitive.Viewport>
            <ScrollAreaPrimitive.Scrollbar
              className="scroll-area-bar"
              orientation="vertical"
            >
              <ScrollAreaPrimitive.Thumb className="scroll-area-thumb" />
            </ScrollAreaPrimitive.Scrollbar>
            <ScrollAreaPrimitive.Corner />
          </ScrollAreaPrimitive.Root>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
