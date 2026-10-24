import { useState } from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import {
  ArrowRight,
  Bell,
  Brain,
  Check,
  ChevronDown,
  CircleAlert,
  Cpu,
  Eye,
  Gauge,
  MousePointerClick,
  PaintBucket,
  PanelRight,
  Plus,
  Puzzle,
  Search,
  Settings,
  Sliders,
  Sparkles,
  TriangleAlert,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import brandTerminal from "./assets/brand-terminal.png";
import { Button } from "./Button";
import { CaptionButtons } from "./ChatExtras";
import { CopyButton } from "./CopyButton";
import { Checkbox, Segmented, Switch } from "./form-controls";
import { DotSpinner, LoadingRing } from "./Loading";
import { Progress } from "./Progress";
import { ToolCard } from "./ProcessRail";
import type { Model } from "./settings-config";
import { Tag } from "./Tag";
import { Tooltip } from "./Tooltip";

type DesignGalleryProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNotify: (title: string, desc?: string) => void;
  model: Model;
  reasoning: string;
  onReasoningChange: (value: string) => void;
  onOpenSettings: () => void;
  onOpenClose: () => void;
  onOpenExtensions: () => void;
  onOpenModel: () => void;
  onOpenContext: () => void;
};

export function DesignGallery({
  open,
  onOpenChange,
  onNotify,
  model,
  reasoning,
  onReasoningChange,
  onOpenSettings,
  onOpenClose,
  onOpenExtensions,
  onOpenModel,
  onOpenContext,
}: DesignGalleryProps) {
  const [demoCheck, setDemoCheck] = useState(true);
  const [demoSwitch, setDemoSwitch] = useState(true);
  const [demoRadio, setDemoRadio] = useState("balanced");

  if (!open) {
    return null;
  }

  return (
        <div className="gallery-overlay" onMouseDown={() => onOpenChange(false)}>
          <div
            className="gallery"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="gallery-head">
              <div>
                <h2>设计零件</h2>
                <p>M0 · 窗口 / 卡片 / 组件 / Radix 原语</p>
              </div>
              <Button
                variant="icon"
                aria-label="关闭设计零件"
                onClick={() => onOpenChange(false)}
              >
                <X size={16} />
              </Button>
            </div>

            <section className="gallery-section">
              <h3>窗口 Window</h3>
              <div className="window-demo">
                <div className="window-demo-bar">
                  <span className="window-demo-brand">
                    <img className="brand-mark-img sm" src={brandTerminal} alt="TesT" />
                  </span>
                  <span className="window-demo-title">工作台</span>
                  <CaptionButtons small />
                </div>
                <div className="window-demo-body">
                  <span className="skeleton" style={{ width: "34%" }} />
                  <span className="skeleton" style={{ width: "78%" }} />
                  <span className="skeleton" style={{ width: "62%" }} />
                </div>
              </div>
              <p className="gallery-note">
                自绘标题栏 44px：左侧品牌与工作区，中间全局搜索，右侧 Windows
                风格最小化 / 最大化 / 关闭。关闭悬停 #C42B1C。
              </p>
            </section>

            <section className="gallery-section">
              <h3>卡片 Card</h3>
              <div className="gallery-grid">
                <div className="demo-card">
                  <div className="demo-card-head">
                    <span className="demo-icon">
                      <Cpu size={12} />
                    </span>
                    <b>基础卡片</b>
                    <Tag tone="mint">hover</Tag>
                  </div>
                  <p className="demo-desc">
                    1px 描边 + 极浅阴影；悬停抬升 1px、阴影加深。所有面板共用一套。
                  </p>
                  <div className="demo-foot">
                    <span className="muted">12px 圆角</span>
                    <Button size="sm" variant="secondary">
                      <Eye size={13} /> 查看
                    </Button>
                  </div>
                </div>

                <div className="demo-card">
                  <div className="demo-card-head">
                    <span className="demo-icon">
                      <Zap size={12} />
                    </span>
                    <b>指标卡片</b>
                  </div>
                  <div className="demo-big">
                    42<span>%</span>
                  </div>
                  <Progress value={42} />
                  <div className="meter-foot">
                    <span>84k tokens</span>
                    <span>200k</span>
                  </div>
                </div>

                <div className="demo-card">
                  <div className="demo-card-head">
                    <span className="demo-icon">
                      <Wrench size={12} />
                    </span>
                    <b>工具卡片</b>
                    <Tag>read</Tag>
                  </div>
                  <ToolCard name="read" target="src/App.tsx" duration="124 ms">
                    <div className="tool-line">
                      <span className="tk">ok</span> 读取 42 行
                    </div>
                  </ToolCard>
                </div>

                <div className="demo-card">
                  <div className="demo-card-head">
                    <span className="demo-icon">
                      <Puzzle size={12} />
                    </span>
                    <b>拖入安装</b>
                  </div>
                  <button type="button"
                    className="dropzone"
                    onClick={() => onNotify("拖入安装", "支持 .zip / 文件夹")}
                  >
                    <Plus size={13} /> 拖入 .zip / 文件夹
                  </button>
                  <p className="demo-desc">
                    扩展与技能共用同一个入口，拖进来即安装。
                  </p>
                </div>
              </div>
            </section>

            <section className="gallery-section">
              <h3>Radix / shadcn 原语</h3>
              <div className="gallery-row">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    onOpenSettings();
                  }}
                >
                  <Sliders size={13} /> 设置 Dialog
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    onOpenClose();
                  }}
                >
                  <X size={13} /> 退出 AlertDialog
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    onOpenExtensions();
                  }}
                >
                  <Puzzle size={13} /> 扩展 Sheet
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    onOpenModel();
                  }}
                >
                  <Sparkles size={13} /> 模型 Popover
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    onOpenContext();
                  }}
                >
                  <PanelRight size={13} /> 上下文 Sheet
                </Button>
              </div>
              <div className="gallery-row gallery-row-gap">
                <Segmented
                  value={demoRadio}
                  onChange={setDemoRadio}
                  options={[
                    {
                      value: "fast",
                      label: "快",
                      icon: <Zap size={11} />,
                    },
                    {
                      value: "balanced",
                      label: "平衡",
                      icon: <Gauge size={11} />,
                    },
                    {
                      value: "deep",
                      label: "深",
                      icon: <Brain size={11} />,
                    },
                  ]}
                />
                <ToggleGroupPrimitive.Root
                  className="toggle-group"
                  type="single"
                  value={reasoning}
                  onValueChange={(value) => {
                    if (value) onReasoningChange(value);
                  }}
                >
                  <ToggleGroupPrimitive.Item value="low" className="toggle-item">
                    <Gauge size={11} /> low
                  </ToggleGroupPrimitive.Item>
                  <ToggleGroupPrimitive.Item
                    value="medium"
                    className="toggle-item"
                  >
                    <Zap size={11} /> medium
                  </ToggleGroupPrimitive.Item>
                  <ToggleGroupPrimitive.Item value="high" className="toggle-item">
                    <Brain size={11} /> high
                  </ToggleGroupPrimitive.Item>
                </ToggleGroupPrimitive.Root>
                <span className="muted">
                  右键任意会话 · 悬停会话标题 · 拖动分栏
                </span>
              </div>
            </section>

            <section className="gallery-section">
              <h3>按钮 Button</h3>
              <div className="gallery-row">
                <Button variant="primary">
                  <Check size={13} /> 主要
                </Button>
                <Button variant="secondary">
                  <ArrowRight size={13} /> 次要
                </Button>
                <Button variant="ghost">
                  <Sparkles size={13} /> 幽灵
                </Button>
                <Button variant="danger">
                  <TriangleAlert size={13} /> 危险
                </Button>
                <Button variant="icon" aria-label="设置">
                  <Settings size={15} />
                </Button>
                <Button variant="primary" disabled>
                  <CircleAlert size={13} /> 禁用
                </Button>
                <button type="button" className="btn btn-fill">
                  <PaintBucket size={13} /> 描边填充
                </button>
                <button type="button" className="btn btn-press">
                  <MousePointerClick size={13} /> 按压反馈
                </button>
              </div>
            </section>

            <section className="gallery-section">
              <h3>表单 Form</h3>
              <div className="gallery-grid">
                <div className="demo-card">
                  <label className="field-label">输入框</label>
                  <div className="input-with-icon">
                    <Search size={13} />
                    <input className="input" placeholder="搜索模型…" />
                  </div>
                  <label className="field-label">选择</label>
                  <button type="button" className="select-like">
                    <span>
                      <Sliders size={12} /> {model.label}
                    </span>
                    <ChevronDown size={13} />
                  </button>
                </div>
                <div className="demo-card">
                  <div className="check-row">
                    <Checkbox
                      checked={demoCheck}
                      onChange={() => setDemoCheck((value) => !value)}
                    />
                    <span>记住这个工作区</span>
                  </div>
                  <div className="check-row">
                    <Switch
                      checked={demoSwitch}
                      onChange={() => setDemoSwitch((value) => !value)}
                    />
                    <span>自动压缩上下文</span>
                  </div>
                  <div className="check-row">
                    <Segmented
                      value={demoRadio}
                      onChange={setDemoRadio}
                      options={[
                        {
                          value: "fast",
                          label: "快",
                          icon: <Zap size={11} />,
                        },
                        {
                          value: "balanced",
                          label: "平衡",
                          icon: <Gauge size={11} />,
                        },
                        {
                          value: "deep",
                          label: "深",
                          icon: <Brain size={11} />,
                        },
                      ]}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="gallery-section">
              <h3>反馈 Feedback</h3>
              <div className="gallery-row">
                <Tag>默认</Tag>
                <Tag tone="mint">在线</Tag>
                <Tag tone="blue">模型</Tag>
                <Tag tone="amber">等待</Tag>
                <Tag tone="red">错误</Tag>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onNotify("已保存到 Pi 配置", "models.json")}
                >
                  <Bell size={13} /> 触发 Toast
                </Button>
                <LoadingRing size={14} />
                <DotSpinner />
              </div>
              <div className="skeleton-stack">
                <span className="skeleton" style={{ width: "46%" }} />
                <span className="skeleton" style={{ width: "82%" }} />
                <span className="skeleton" style={{ width: "64%" }} />
              </div>
            </section>

            <section className="gallery-section">
              <h3>微交互 Micro</h3>
              <div className="gallery-row">
                <CopyButton text="const answer = 42;" />
                <Tooltip tip="极简淡入 Tooltip">
                  <button type="button" className="btn btn-secondary">
                    <Sparkles size={13} /> 悬停我
                  </button>
                </Tooltip>
                <span className="muted">
                  160–220ms · cubic-bezier(.2,.8,.2,1)
                </span>
              </div>
            </section>
          </div>
        </div>
  );
}
