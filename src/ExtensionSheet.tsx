import { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import {
  BookOpen,
  Check,
  ChevronDown,
  CircleAlert,
  Download,
  FolderOpen,
  Package,
  Plus,
  Puzzle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "./Button";
import { Segmented, Switch } from "./form-controls";
import { Tag } from "./Tag";

export type Extension = {
  name: string;
  kind: "技能" | "扩展";
  desc: string;
  enabled: boolean;
  scope?: "global" | "project";
  readonly?: boolean;
  path?: string;
  package?: boolean;
  source?: string;
  version?: string;
  installed?: boolean;
  packageIndex?: number;
  resources?: {
    extensions: number;
    skills: number;
    prompts: number;
  };
};

export type PackageInstallOutcome = {
  ok: boolean;
  source?: string;
  note?: string;
  error?: string;
};

function ExtensionSheet({
  open,
  onOpenChange,
  skills,
  extensions,
  project,
  onToggle,
  onRemove,
  onDrop,
  onInstallSource,
  onOpenFolder,
  onTrustProject,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skills: Extension[];
  extensions: Extension[];
  project?: {
    cwd: string;
    trusted: boolean;
    hasResources: boolean;
    skillsDir?: string;
    extensionsDir?: string;
  } | null;
  onToggle: (item: Extension) => void;
  onRemove: (item: Extension) => void;
  onDrop: (kind: "skill" | "extension", file: File) => void;
  onInstallSource: (source: string) => Promise<PackageInstallOutcome>;
  onOpenFolder: (
    kind: "skill" | "extension",
    scope?: "global" | "project",
  ) => void;
  onTrustProject: () => void;
}) {
  const [packageSource, setPackageSource] = useState("");
  const [packageSourceOpen, setPackageSourceOpen] = useState(false);
  const [packageInstalling, setPackageInstalling] = useState(false);
  const [packageFeedback, setPackageFeedback] =
    useState<PackageInstallOutcome | null>(null);
  const [installKind, setInstallKind] = useState<"skill" | "extension">(
    "skill",
  );

  const installPackageSource = async (value: string) => {
    const source = value.trim();
    if (!source || packageInstalling) {
      return;
    }
    setPackageSource(source);
    setPackageSourceOpen(true);
    setPackageInstalling(true);
    setPackageFeedback(null);
    let outcome: PackageInstallOutcome;
    try {
      outcome = await onInstallSource(source);
    } catch (error) {
      outcome = { ok: false, error: String(error) };
    }
    setPackageInstalling(false);
    setPackageFeedback(outcome);
    if (outcome.ok) {
      setPackageSource("");
      setPackageSourceOpen(false);
    }
  };

  const submitPackageSource = () => installPackageSource(packageSource);

  const packageInstaller = (
    <div className="package-install">
      <button type="button"
        className="package-source-toggle"
        aria-expanded={packageSourceOpen}
        onClick={() => setPackageSourceOpen((value) => !value)}
      >
        <Package size={13} />
        {packageSourceOpen
          ? "收起 npm / Git 安装"
          : "输入 npm / Git 地址安装 Pi 包"}
        <ChevronDown
          size={12}
          className={packageSourceOpen ? "open" : ""}
        />
      </button>
      {packageSourceOpen && (
        <form
          className="package-source-form"
          onSubmit={(event) => {
            event.preventDefault();
            void submitPackageSource();
          }}
        >
          <input
            className="input"
            value={packageSource}
            autoFocus
            disabled={packageInstalling}
            placeholder="包名、npm 包链接或 Git 地址"
            spellCheck={false}
            onChange={(event) => {
              setPackageSource(event.target.value);
              if (packageFeedback) {
                setPackageFeedback(null);
              }
            }}
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!packageSource.trim() || packageInstalling}
            icon={
              packageInstalling ? (
                <RefreshCw size={12} className="spin" />
              ) : (
                <Download size={12} />
              )
            }
          >
            {packageInstalling ? "安装中" : "安装"}
          </Button>
        </form>
      )}
      {packageInstalling && (
        <div className="package-feedback installing" aria-live="polite">
          <RefreshCw size={13} className="spin" />
          <div className="package-feedback-main">
            <b>正在安装</b>
            <small>正在下载 Pi 包和依赖，首次安装可能需要几十秒。</small>
          </div>
        </div>
      )}
      {!packageInstalling && packageFeedback && (
        <div
          className={`package-feedback ${
            packageFeedback.ok ? "success" : "error"
          }`}
          role={packageFeedback.ok ? "status" : "alert"}
        >
          {packageFeedback.ok ? (
            <Check size={13} strokeWidth={2.5} />
          ) : (
            <CircleAlert size={13} />
          )}
          <div className="package-feedback-main">
            <b>
              {packageFeedback.ok
                ? `已安装 ${packageFeedback.source || "Pi 包"}`
                : "安装失败"}
            </b>
            {packageFeedback.note && <small>{packageFeedback.note}</small>}
            {packageFeedback.error && <pre>{packageFeedback.error}</pre>}
          </div>
          <button
            type="button"
            className="package-feedback-close"
            aria-label="关闭安装结果"
            onClick={() => setPackageFeedback(null)}
          >
            <X size={11} />
          </button>
        </div>
      )}
      {packageSourceOpen && (
        <p className="package-source-hint">
          支持包名、npm i 包名、npm/pnpm/yarn/bun 安装命令、npmjs 或
          registry 链接，以及 GitHub 地址。无需手动执行 npm 命令。
        </p>
      )}
    </div>
  );

  const renderGroup = (
    kind: "skill" | "extension",
    title: string,
    items: Extension[],
  ) => {
    const projectItems = items.filter(
      (item) => item.scope === "project",
    );
    const globalItems = items.filter(
      (item) => item.scope !== "project",
    );
    return (
    <section className="extension-group">
      <div className="extension-group-head">
        <b>{title}</b>
        <span>
          {items.length === 0
            ? "暂无已安装项"
            : `${globalItems.filter((item) => item.enabled).length} 个已启用${
                projectItems.length > 0
                  ? ` · ${projectItems.length} 个项目`
                  : ""
              }`}
        </span>
        <button type="button" className="link" onClick={() => onOpenFolder(kind)}>
          <FolderOpen size={11} /> 打开目录
        </button>
      </div>
      <div className="extension-list">
        {items.map((item) => (
          <div
            className="ext-row"
            key={`${item.scope || "global"}-${kind}-${item.name}-${item.source || item.path || ""}`}
          >
            <span className={`ext-icon ${item.package ? "package" : ""}`}>
              {kind === "skill" ? (
                <Sparkles size={13} />
              ) : item.package ? (
                <Package size={13} />
              ) : (
                <Puzzle size={13} />
              )}
            </span>
            <div className="ext-main">
              <b>
                {item.name}
                {item.package && <Tag tone="mint">Pi 包</Tag>}
                {item.scope === "project" && (
                  <Tag tone="blue">项目</Tag>
                )}
                {item.installed === false && (
                  <Tag tone="amber">待下载</Tag>
                )}
              </b>
              <small title={item.source || item.path || item.desc}>
                {item.desc}
                {item.version ? ` · v${item.version}` : ""}
              </small>
            </div>
            {item.readonly ? null : (
              <>
                <button type="button"
                  className="ext-remove"
                  title="删除"
                  onClick={() => onRemove(item)}
                >
                  <Trash2 size={12} />
                </button>
                <Switch
                  checked={item.enabled}
                  onChange={() => onToggle(item)}
                />
              </>
            )}
          </div>
        ))}
      </div>
    </section>
    );
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="rx-overlay" />
        <DialogPrimitive.Content
          className="sheet"
          tabIndex={-1}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            (event.currentTarget as HTMLElement).focus();
          }}
        >
          <div className="sheet-head">
            <div>
              <DialogPrimitive.Title className="sheet-title">
                技能与扩展
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="sheet-desc">
                全局安装目录 + 当前项目 .pi 资源
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="icon" aria-label="关闭">
                <X size={15} />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <ScrollAreaPrimitive.Root className="scroll-area">
            <ScrollAreaPrimitive.Viewport className="scroll-area-viewport extension-scroll-viewport">
              <div className="sheet-body">
                {project?.hasResources && (
                  <div
                    className={`project-trust ${
                      project.trusted ? "trusted" : ""
                    }`}
                  >
                    <div className="project-trust-main">
                      <b>当前项目资源</b>
                      <small>{project.cwd}</small>
                      <span>
                        {project.trusted
                          ? "已信任 · Pi 会加载 .pi/skills 与 .pi/extensions"
                          : "尚未信任 · Pi 暂不加载项目技能 / 扩展"}
                      </span>
                    </div>
                    <div className="project-trust-actions">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<BookOpen size={12} />}
                        onClick={() => onOpenFolder("skill", "project")}
                      >
                        技能目录
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Puzzle size={12} />}
                        onClick={() =>
                          onOpenFolder("extension", "project")
                        }
                      >
                        扩展目录
                      </Button>
                      {!project.trusted && (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<ShieldCheck size={12} />}
                          onClick={onTrustProject}
                        >
                          信任并加载
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                <section className="extension-installer">
                  <div className="extension-installer-head">
                    <b>添加资源</b>
                    <span>安装技能、扩展或完整 Pi 包</span>
                  </div>
                  <div className="extension-installer-target">
                    <span>安装到</span>
                    <Segmented
                      value={installKind}
                      options={[
                        {
                          value: "skill",
                          label: "技能",
                          icon: <Sparkles size={11} />,
                        },
                        {
                          value: "extension",
                          label: "扩展",
                          icon: <Puzzle size={11} />,
                        },
                      ]}
                      onChange={(value) =>
                        setInstallKind(value as "skill" | "extension")
                      }
                    />
                  </div>
                  <button type="button"
                    className="dropzone extension-install-dropzone"
                    title="拖入 .zip 或文件夹；点击打开对应安装目录"
                    onClick={() => onOpenFolder(installKind)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const file = event.dataTransfer.files?.[0];
                      if (file) {
                        onDrop(installKind, file);
                        return;
                      }
                      const uriList =
                        event.dataTransfer.getData("text/uri-list");
                      const plain = event.dataTransfer.getData("text/plain");
                      const source = (uriList || plain)
                        .split(/\r?\n/)
                        .map((line) => line.trim())
                        .find((line) => line && !line.startsWith("#"));
                      if (source) {
                        void installPackageSource(source);
                      }
                    }}
                  >
                    <Plus size={13} />
                    拖入 .zip / 文件夹安装
                    {installKind === "skill" ? "技能" : "扩展"} ·{" "}
                    {installKind === "skill"
                      ? "SKILL.md"
                      : "package.json"}
                  </button>
                  {packageInstaller}
                </section>
                {renderGroup(
                  "skill",
                  "技能",
                  skills,
                )}
                {renderGroup(
                  "extension",
                  "扩展",
                  extensions,
                )}
                <p className="sheet-tip">
                  全局技能安装在 TesT 的 Pi 数据目录 skills/，扩展安装在
                  extensions/；禁用后会移到 disabled 目录。Pi 包通过
                  npm:/git: 安装，会同时带入它声明的扩展、技能和提示词。
                  当前项目的 .pi 资源以「项目」标记列出，信任项目后 Pi
                  才会加载。
                </p>
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

export default ExtensionSheet;
