# TesT 设计选型（M0）

目标：Pi + CC 的桌面工作台。窗口、卡片、组件全部原生 React + CSS，不引入第三方 UI 运行时。

## 1. 窗口

| 决策 | 来源 | 处理 |
| --- | --- | --- |
| 采用 | Uiverse `Cards/aadium_mighty-dog-12` | 借用 caption 按钮的排列与 hover 区域，改为 44px 自绘标题栏、中性色、关闭 `#C42B1C` |
| 采用 | shadcn `Sidebar` + `Breadcrumb` | 左侧工作区树、标题面包屑 |
| 淘汰 | Uiverse `Cards/NlghtM4re_evil-warthog-61` | 2px 黑边、绿色终端、`position:absolute`，不适合作为应用外壳 |
| 淘汰 | macOS 红黄绿交通灯 | 目标是 Windows 桌面端，右侧最小化/最大化/关闭更符合平台习惯 |

标题栏结构：品牌 + 工作区（左） / 全局搜索 Ctrl K（中） / 工具 + caption（右）。

## 2. 卡片

| 决策 | 来源 | 处理 |
| --- | --- | --- |
| 采用 | Uiverse `Cards/Yaya12085_little-puma-29` | 1px 描边 + `0 1px 2px` 阴影 + 小圆角，升级为 12px 圆角 |
| 采用 | Uiverse `Cards/akshat-patel28_smart-termite-33` | 保留 hover 抬升与阴影加深，幅度从 -10px 收到 -1px |
| 采用 | Uiverse `Cards/mi-series_splendid-eagle-61` | 指标卡片的数字层级，去掉边框与彩色 ribbon |
| 淘汰 | `Cards/Admin12121_little-catfish-39` | 0.7s 彩色气泡位移，和工具型产品的节奏不符 |
| 淘汰 | `Cards/0xnihilism_cold-tiger-22` | 扫描线、glitch、霓虹，视觉噪音过大 |
| 淘汰 | `Cards/0xnihilism_thin-crab-36` | 10px 硬阴影 brutalism，不适合长对话 |
| 淘汰 | `Cards/abdinejad_tall-stingray-83` | 信用卡造型，18px 圆角 + 15px 阴影，语义与密度都不匹配 |

统一规则：`1px border + shadow-xs`；hover 只做 `translateY(-1px)` 与 `shadow-sm`；不做彩色底、不做大面积渐变。

## 3. 组件

| 组件 | 决策 | 来源 / 说明 |
| --- | --- | --- |
| 主按钮 | 采用 | shadcn preset `bJMSkfGi`：黑底白字，hover `#262626` |
| 描边填充按钮 | 采用 | Uiverse `Buttons/adamgiebl_rude-bear-14`，只保留描边 → 填充 |
| 按压按钮 | 采用 | Uiverse `Buttons/barisdogansutcu_loud-mayfly-89`，2px 下沉 |
| 复制变勾 | 采用 | Uiverse `Buttons/Galahhad_kind-cheetah-52` |
| 输入框 | 采用 | Uiverse `Inputs/bedirhan-arslan_stale-fly-98` 的 focus ring 思路，改为 3px 柔和 ring |
| 输入框 | 淘汰 | `BurgiSimon/rotten-dolphin-78`（双层硬阴影）、`Alanav29/tough-ape-65`（紫色缩放 label） |
| 复选框 | 采用 | Uiverse `Checkboxes/catraco_hungry-squid-59` 的 scale-in + 微小回弹 |
| 复选框 | 淘汰 | `elijahgummer/friendly-wombat-2`（40px 擦除位移）、`hard-liger-45`（书签造型） |
| 开关 | 采用 | Uiverse `Toggle-switches/elijahgummer_tender-horse-32` 的弹簧位移，去掉 8 层堆叠阴影与 1.2 放大 |
| 单选 | 采用 | `Radio-buttons/elijahgummer_soft-firefox-40` 的按压手感，改造成分段控件 |
| 单选 | 淘汰 | `3bdel3ziz-T/gentle-vampirebat-46`（只能 hover 展开，键盘不可用） |
| Tooltip | 采用 | Uiverse `Tooltips/csemszepp_ordinary-owl-54` 的极简淡入，延迟 320ms |
| 点状加载 | 采用 | Uiverse `loaders/ashish-yadv_hungry-otter-20` |
| 环形加载 | 采用 | Uiverse `loaders/abrahamcalsin_serious-turkey-52` 的环形思路，简化为 1.5px 圆环 |
| Toast | 自建 | `Notifications/` 里的升级/彩带/游戏化通知全部淘汰，按 shadcn Sonner 做标题 + 描述 + 进度条 |

按钮交互规范：所有原生按钮默认 `type="button"`；纯图标按钮必须有 `aria-label` 或 `title`；图标点击区不少于 24×24；hover 只做轻微图标抬升，active 做一次短缩放；`prefers-reduced-motion` 下关闭位移和缩放。

## 4. shadcn / Radix 组件映射

本轮按「能装的全装、但主界面保持克制」接入了 17 个 Radix 原语 + `react-resizable-panels`：

| 原语 | 主界面用法 | 设置 / 弹层用法 |
| --- | --- | --- |
| `Dialog` | 设置入口 | 设置弹窗 |
| `AlertDialog` | 标题栏关闭 | 退出确认 |
| `DropdownMenu` | 工作区「⋯」、会话「更多」 | 菜单项与快捷键提示 |
| `ContextMenu` | 会话右键 | 打开 / 重命名 / 复制 / 归档 / 删除 |
| `HoverCard` | 悬停会话标题 | 会话预览卡 |
| `Popover` | 模型、推理强度 | 浮动菜单定位 |
| `Select` | 工作区分支切换 | 默认模型选择 |
| `Tabs` | 右侧「本轮改动 / 技能与扩展」 | 设置「外观 / 模型 / 快捷键」 |
| `Collapsible` | 工具调用卡片 | 高级选项 |
| `ScrollArea` | 左侧会话树 | 扩展抽屉 / 上下文抽屉 |
| `Separator` | — | 设置分组 |
| `Switch` | 扩展启用状态 | 深色模式、流式输出 |
| `Checkbox` | — | 启动恢复会话 |
| `RadioGroup` | 分段控件 | 界面密度 |
| `ToggleGroup` | 推理强度 | 强调色、默认推理 |
| `Progress` | 上下文占用 | 设置里的用量说明 |
| `Tooltip` | 标题栏、输入区图标 | 320ms 延迟，portal |
| `Sheet` | 上下文抽屉（窄窗口） | 技能与扩展抽屉 |
| `Resizable` | 三栏可拖动 | — |

保留自建但已对齐设计：`Command`（Ctrl K）、`Toast`（进度条）、`Skeleton`、`Badge`、`Input`、`Breadcrumb`。

未接入且不建议为「凑数」接入：`Calendar`、`Carousel`、`Chart`、`NavigationMenu`、`Pagination`、`InputOTP`。它们不属于当前桌面工作台的核心路径。

## 4.5 液态玻璃（M1.5）

只把液态玻璃用在「工作区 chrome」上，聊天正文保持哑光，避免影响阅读。

| 决策 | 来源 | 用法 |
| --- | --- | --- |
| 采用 | Uiverse `Cards/bociKond_perfect-bear-45` | 玻璃列表面板 → 左侧工作区、会话行 |
| 采用 | Uiverse `Cards/G4b413l_good-crab-75` | 彩色光斑 + 磨砂卡片 → 侧栏环境光 |
| 采用 | Uiverse `Cards/boryanakrasteva_strong-cat-50` | `backdrop-filter: blur(20px)` 的玻璃表面 |
| 采用 | Uiverse `Cards/adamgiebl_blue-mole-92` | 彩色 blob 在磨砂层后缓慢漂移 |
| 采用 | Uiverse `Buttons/yuuzuk_fat-owl-93` | 新建会话按钮的玻璃底色 |
| 采用 | Uiverse `Buttons/elijahgummer_short-bird-25` | 按钮 / 会话行 hover 的高光扫过 |
| 备选 | Uiverse `Tooltips/Invacui_smart-kangaroo-41` | 玻璃 Tooltip（当前保留深色 tooltip） |
| 备选 | Uiverse `Checkboxes/TechByElijah_stale-treefrog-11` | 玻璃复选框（设置页后续） |
| 备选 | Uiverse `Toggle-switches/SmookyDev_tricky-husky-54` | 玻璃开关（设置页后续） |

实现层：`--glass`、`--glass-strong`、`--glass-border`、`--glass-shadow`、`--glass-blur` 五组 token，亮/暗两套。侧栏用 `::before` 做缓慢漂移的薄荷 / 海蓝 / 琥珀光斑；按钮和用户卡用 `::after` 做高光扫过；所有玻璃表面带 1px 内高光。

## 5. 设计 token

- 字体：Geist / Geist Mono；回退 Segoe UI Variable、Cascadia Code
- 圆角：10px；大面板 12px；窗口 16px
- 浅色：`#ffffff` 底 / `#fafaf8` 面板 / `#e6e6e2` 边框 / `#0a0a0a` 文字
- 深色：`#0f1311` 底 / `#121715` 面板 / `#242c27` 边框 / `#e9eeea` 文字
- 强调：`#1f9d74`（浅）/ `#3ddc97`（深），只用于状态、选中、进度
- 动效：160–220ms，`cubic-bezier(.2,.8,.2,1)`；弹簧只用于开关和复选框
- 禁止：霓虹、3D、玻璃拟态、重阴影、大面积渐变、逐字滑入

## 6. 原型入口

```bash
cd tesT
npm run dev
```

- 主界面：`http://127.0.0.1:5180/`
- 深色：`?dark=1`
- 组件画廊：`?gallery=1`
- 折叠树：`?collapsed=1`
- 命令面板：`?cmd=1`（或 Ctrl K）
- 设置：`?settings=1`（模型页 `&tab=models`，快捷键页 `&tab=shortcuts`）
- 技能与扩展抽屉：`?sheet=1`
- 上下文抽屉：`?sheet=context`
- 退出确认：`?close=1`
- 模型菜单：`?menu=1`

## 7. 图标

- 静态图标统一使用 `lucide-react`，保持 24px 网格与细线风格。
- 状态变化使用 `morphicons/react`，图标数据从 `lucide` 原始节点包读取；当前覆盖发送/停止、复制/已复制、深浅色、开关勾选状态。
- 所有可交互控件必须有语义图标：文本按钮使用前置图标，菜单项使用左侧图标，状态型控件在自身内部显示状态图形。
- 图标尺寸固定为 11–15px；按钮内图标不参与文字换行，状态动画遵守 140–220ms 的设计节奏。
- 强调色属于颜色样本本身，不再额外叠加装饰图标；未选中复选框保持空槽语义。
