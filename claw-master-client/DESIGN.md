# Claw Master 设计系统

## 1. 视觉主题与氛围

Claw Master 是一个基于 shadcn/ui 的 AI 对话应用设计系统。设计语言遵循**中性优先**原则——一种克制、系统化的调色板，以纯中性灰色为基础，让界面本身退居其次，使内容成为焦点。美学风格是**功能现代**——简洁的表面、细微的边框、对主色的克制使用，用于真正的主要操作，创建专业、专注的工具，并通过强大的亮色/暗色模式支持实现无限自定义。

排版系统是单轨的：`var(--font-family-body)` 和 `var(--font-family-heading)` 目前解析为相同的主 UI 字体。代码渲染组件在本地拥有自己的等宽字体栈。

**关键特征：**

- 冷静的 UI 基础：Chrome 保持大部分中性；`var(--color-primary)` 保留用于真正的主要操作和选中状态
- 双模式系统：完全指定的亮色和暗色令牌，具有真正的反转
- 语义状态颜色：`var(--color-destructive)`（红色）、`var(--color-success)`（绿色）、`var(--color-warning)`（琥珀色）、`var(--color-info)`（蓝色）
- 圆角比例从 `var(--radius-none)` (0) 到 `var(--radius-round)` (9999px)，10 步
- 通过颜色而非阴影实现表面堆叠：`var(--color-background)` → `var(--color-card)` → `var(--color-popover)`
- 7 级阴影实用工具系统（`--shadow-2xs` 到 `--shadow-2xl`）
- 侧边栏作为独特的空间区域，有自己的完整令牌集：`var(--color-sidebar)`、`var(--color-sidebar-primary)`、`var(--color-sidebar-accent)`、`var(--color-sidebar-border)`

## 2. 调色板与角色

### 原色

- **Primary**: `var(--color-primary)` — 用于真正页面操作、选中状态、链接和组件强调色的主强调色
- **Primary Foreground**: `var(--color-primary-foreground)` — `bg-primary` 表面的对比文本

### 文本颜色

- **Foreground**: `var(--color-foreground)` — 主要正文文本
- **Foreground Secondary**: `var(--color-foreground-secondary)` — 次要文本、辅助标签
- **Foreground Muted**: `var(--color-foreground-muted)` — 占位符、禁用、低强调文本

### 表面与背景

- **Background**: `var(--color-background)` — 主页面背景
- **Card**: `var(--color-card)` — 提起的卡片表面
- **Popover**: `var(--color-popover)` — 浮动面板表面
- **Muted**: `var(--color-muted)` — 次要背景、禁用状态
- **Secondary**: `var(--color-secondary)` — 次要操作背景

### 边框与环

- **Border**: `var(--color-border)` — 组件边框、分隔线
- **Input**: `var(--color-input)` — 输入字段边框
- **Ring**: `var(--color-ring)` — 焦点环

### 语义状态

- **Destructive**: `var(--color-destructive)` — 错误状态、危险操作
- **Success**: `var(--color-success)` — 积极状态、确认
- **Warning**: `var(--color-warning)` — 谨慎状态、待处理操作
- **Info**: `var(--color-info)` — 信息状态、中性高亮

### 主色调

默认使用 `var(--color-primary)` 作为连接和品牌颜色。

## 3. 排版规则

### 字体

- **Body/Heading**: `var(--font-family-body)` / `var(--font-family-heading)` → 带 system-ui 回退的主 UI 字体
- **Mono**: 代码渲染组件的等宽字体栈

### 字号比例

| 角色 | 令牌 | 近似值 |
|------|------|--------|
| Body XS | `var(--font-size-body-xs)` | 12px |
| Body SM | `var(--font-size-body-sm)` | 14px |
| Body MD | `var(--font-size-body-md)` | 16px |
| Body LG | `var(--font-size-body-lg)` | 18px |
| Heading XS | `var(--font-size-heading-xs)` | 20px |
| Heading SM | `var(--font-size-heading-sm)` | 24px |
| Heading MD | `var(--font-size-heading-md)` | 32px |

### 字重

| 字重 | 令牌 | 用法 |
|------|------|------|
| Regular | `var(--font-weight-regular)` (400) | 正文、描述、次要标签 |
| Medium | `var(--font-weight-medium)` (500) | 导航、强调正文、表单标签 |
| Bold | `var(--font-weight-bold)` (700) | 页面标题、强强调、英雄标题 |

## 4. 组件样式

### 按钮

**基础**

- 布局：内联 flex，居中，`gap-2`，无换行
- 圆角/字体/动画：`rounded-md`、`font-normal`、`transition-all`

**变体**

| 变体 | 背景 | 边框 | 悬停 | 用途 |
|------|------|------|------|------|
| Default | 主色 | 无 | 主色悬停 | 主要 CTA |
| Outline | 透明 | 边框 | 填充 accent | 次要/取消操作 |
| Secondary | secondary | 无 | secondary-hover | 次要操作 |
| Ghost | 透明 | 无 | 填充 accent | 工具栏操作 |
| Destructive | destructive | 无 | destructive-hover | 危险操作 |

### 对话框

**基础**

- 表面：`bg-card`
- 圆角：`rounded-3xl`
- 圆角：无（`border-0`）
- 填充：`p-6`，`gap-4`
- 阴影：`shadow-xl`
- 动画：淡入 + 缩放过渡

### 输入

- 背景：`var(--color-background)`
- 边框：1px solid `var(--color-input)`
- 圆角：`var(--radius-md)` (8px)
- 阴影：无——输入保持扁平
- 焦点环：使用 `var(--color-ring)`

### 侧边栏

**颜色：**

- 背景：`var(--color-sidebar)`
- 文本：`var(--color-sidebar-foreground)`
- 边框：`0.5px solid var(--color-border)`
- 激活项：`var(--color-sidebar-accent)` 背景+文本

## 5. 布局原则

### 窗口 Chrome

- **顶部高度**：`var(--app-top-chrome-height)` = 44px

### 设置面板布局

两列形状：

| 列 | 宽度 | 组成 |
|----|------|------|
| 左侧子菜单 | 200px | `PageHeader` → `Scrollbar` → `MenuList` |
| 右侧详情 | `flex-1` | 页面自有内容 |

### 间距系统

使用 Tailwind 间距实用程序（`p-4`、`gap-6`）。

### 圆角比例

| 令牌 | 近似值 | 用途 |
|------|--------|------|
| `radius-none` | 0 | 方形角 |
| `radius-sm` | 6px | 徽章、标签 |
| `radius-md` | 8px | 默认——按钮、输入、下拉 |
| `radius-lg` | 10px | 卡片、面板 |
| `radius-xl` | 14px | 大卡片 |
| `radius-3xl` | 22px | 对话框、侧面板 |
| `radius-round` | 9999px | 药丸、头像 |

## 6. 深度与海拔

Claw Master 使用**表面颜色层叠**实现结构层次，**框阴影**实现交互反馈（悬停状态、浮动元素）。

### 表面颜色层

| 层级 | 令牌 | 用途 |
|------|------|------|
| 地面（0 级） | `var(--color-background)` | 页面背景 |
| 卡片（1 级） | `var(--color-card)` | 提升的表面 |
| 弹出（2 级） | `var(--color-popover)` | 浮动面板表面 |