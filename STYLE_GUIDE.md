# YT-DLP Service 样式指南

本文档记录了项目中使用的设计系统、组件模式和样式规范，可作为其他项目的参考。

## 目录

1. [设计理念](#设计理念)
2. [色彩系统](#色彩系统)
3. [排版规范](#排版规范)
4. [间距系统](#间距系统)
5. [核心组件](#核心组件)
6. [常用模式](#常用模式)
7. [响应式设计](#响应式设计)
8. [辅助工具](#辅助工具)

---

## 设计理念

### 核心原则

- **简洁优先**：界面简洁清晰，避免过度装饰
- **一致性**：统一的视觉语言和交互模式
- **可访问性**：良好的对比度和键盘导航支持
- **响应式**：移动端优先，适配各种屏幕尺寸

### 技术栈

- **框架**: Next.js 15 + React 19
- **样式**: Tailwind CSS 3.x
- **组件**: Radix UI (无样式基础组件)
- **变体管理**: Class Variance Authority (CVA)
- **工具函数**: `cn()` (clsx + tailwind-merge)

---

## 色彩系统

### 中性色 (Neutral)

项目主要使用 Tailwind 的 `neutral` 色板：

```css
/* 主要背景 */
bg-white              /* #ffffff - 卡片背景 */
bg-neutral-50         /* #fafafa - 次要背景 */
bg-neutral-100        /* #f5f5f5 - 禁用状态 */

/* 边框 */
border-neutral-100    /* #f5f5f5 - 分隔线 */
border-neutral-200    /* #e5e5e5 - 主边框 */
border-neutral-300    /* #d4d4d4 - 强调边框 */

/* 文字 */
text-neutral-500      /* #737373 - 次要文字/描述 */
text-neutral-600      /* #525252 - 标签文字 */
text-neutral-700      /* #404040 - 正文 */
text-neutral-900      /* #171717 - 标题/强调 */

/* 交互状态 */
bg-neutral-900        /* #171717 - 主按钮/选中状态 */
hover:bg-neutral-800  /* #262626 - 悬停状态 */
```

### 语义色

```css
/* 成功 */
bg-green-50     /* 背景 */
border-green-200
text-green-700
bg-green-600    /* 实心按钮/徽章 */

/* 警告 */
bg-amber-50
border-amber-200
text-amber-700
bg-amber-500

/* 危险/错误 */
bg-red-50
border-red-200
text-red-700
bg-red-600

/* 信息 */
bg-blue-50
border-blue-200
text-blue-700
bg-blue-500
```

### 使用指南

**何时使用中性色：**
- 主要界面布局和容器
- 默认按钮和表单元素
- 导航和菜单

**何时使用语义色：**
- 状态徽章（成功/失败/警告）
- 通知和提示信息
- 操作反馈（确认/取消）

---

## 排版规范

### 字体设置

项目使用系统字体栈（默认 Tailwind 配置）：

```css
font-family: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
```

### 字号层级

```css
text-xs    /* 12px - 辅助说明、表格小字 */
text-sm    /* 14px - 正文、表单标签 */
text-base  /* 16px - 主要正文 */
text-lg    /* 18px - 卡片标题 */
text-xl    /* 20px - 区块标题 */
text-2xl   /* 24px - 页面标题 */
```

### 字重

```css
font-medium   /* 500 - 标签、按钮 */
font-semibold /* 600 - 标题、强调 */
font-bold     /* 700 - 少用，特别强调 */
```

### 行高

```css
leading-none      /* 1 - 标题 */
leading-relaxed   /* 1.625 - 正文 */
leading-6         /* 1.5rem - 预设文本 */
```

### 示例

```tsx
{/* 页面标题 */}
<h1 className="text-2xl font-semibold tracking-tight">任务工作台</h1>

{/* 卡片标题 */}
<h3 className="text-lg font-semibold leading-none tracking-tight">创建新任务</h3>

{/* 描述文字 */}
<p className="text-sm text-neutral-500">选择下载配置、压缩预设和语音服务</p>

{/* 辅助说明 */}
<p className="text-xs text-neutral-500">支持 YouTube、Bilibili 等平台。</p>
```

---

## 间距系统

### Tailwind 间距单位

使用 Tailwind 的 4px 基础单位系统：

```css
gap-2   /* 0.5rem = 8px */
gap-3   /* 0.75rem = 12px */
gap-4   /* 1rem = 16px */
gap-6   /* 1.5rem = 24px */

p-2     /* padding: 8px */
p-4     /* padding: 16px */
p-6     /* padding: 24px */

space-y-2  /* margin-top: 8px (子元素) */
space-y-4  /* margin-top: 16px */
space-y-6  /* margin-top: 24px */
```

### 常用间距模式

**卡片内边距：**
```tsx
<CardHeader className="p-6">
<CardContent className="p-6">
<CardFooter className="p-6">
```

**表单字段间距：**
```tsx
<form className="space-y-6">  {/* 字段组间距 */}
  <div className="space-y-2"> {/* 标签-输入框间距 */}
    <label />
    <input />
    <p />                       {/* 说明文字 */}
  </div>
</form>
```

**按钮组间距：**
```tsx
<div className="flex gap-2">  {/* 横向间距 */}
<div className="flex flex-col gap-3">  {/* 纵向间距 */}
```

---

## 核心组件

### 1. Card 组件

卡片是主要的内容容器，具有一致的边框、圆角和阴影。

**基础结构：**
```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '~/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>标题</CardTitle>
    <CardDescription>描述文字</CardDescription>
  </CardHeader>
  <CardContent>
    {/* 主要内容 */}
  </CardContent>
  <CardFooter>
    {/* 底部操作 */}
  </CardFooter>
</Card>
```

**样式规范：**
```tsx
Card:
  className="rounded-lg border border-neutral-200 bg-white text-neutral-900"

CardHeader:
  className="flex flex-col gap-2 border-b border-neutral-100 p-6"

CardTitle:
  className="text-lg font-semibold leading-none tracking-tight"

CardDescription:
  className="text-sm text-neutral-500"

CardContent:
  className="p-6"
```

**使用场景：**
- 数据展示区块
- 表单容器
- 统计信息面板
- 设置项分组

---

### 2. Button 组件

使用 CVA 管理多种变体，支持不同尺寸和样式。

**变体定义：**
```tsx
import { Button } from '~/components/ui/button'

// 默认样式（黑色）
<Button>提交</Button>

// 轮廓样式
<Button variant="outline">取消</Button>

// 次要样式
<Button variant="subtle">查看详情</Button>

// 幽灵按钮（无背景）
<Button variant="ghost">编辑</Button>

// 危险操作
<Button variant="destructive">删除</Button>

// 链接样式
<Button variant="link">了解更多</Button>
```

**尺寸变体：**
```tsx
<Button size="sm">小按钮</Button>
<Button size="default">默认</Button>
<Button size="lg">大按钮</Button>
<Button size="icon">⚙️</Button>
```

**样式规范：**
```css
/* 基础样式 */
inline-flex items-center justify-center
whitespace-nowrap rounded-md text-sm font-medium
transition-colors
focus-visible:outline-none focus-visible:ring-1
disabled:pointer-events-none disabled:opacity-50

/* 变体样式 */
default:    bg-black text-white hover:bg-neutral-800
outline:    border border-neutral-200 bg-white hover:bg-neutral-100
subtle:     bg-neutral-100 hover:bg-neutral-200
ghost:      text-neutral-700 hover:bg-neutral-100
destructive: bg-red-600 text-white hover:bg-red-700

/* 尺寸 */
sm:      h-8 px-3 text-xs
default: h-10 px-4 py-2
lg:      h-11 px-5 text-base
icon:    h-10 w-10
```

**使用指南：**
- **default**: 主要操作（提交、确认）
- **outline**: 次要操作（取消）
- **subtle**: 中性操作
- **ghost**: 表格行操作、工具栏按钮
- **destructive**: 删除、重置等危险操作

---

### 3. Badge 组件

用于状态标识和标签展示。

**变体：**
```tsx
import { Badge } from '~/components/ui/badge'

<Badge variant="default">默认</Badge>
<Badge variant="outline">轮廓</Badge>
<Badge variant="subtle">次要</Badge>
<Badge variant="success">成功</Badge>
<Badge variant="warning">警告</Badge>
<Badge variant="danger">危险</Badge>
```

**样式规范：**
```css
/* 基础样式 */
inline-flex items-center rounded-full border
px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide

/* 变体 */
default:  border-neutral-200 bg-neutral-900 text-white
outline:  border-neutral-300 text-neutral-700
subtle:   bg-neutral-100 text-neutral-800
success:  bg-green-600 text-white
warning:  bg-amber-500 text-white
danger:   bg-red-600 text-white
```

**使用场景：**
- 任务状态（PENDING, COMPLETED, FAILED）
- 下载类型标签
- 服务可用性指示器
- 分类标签

---

### 4. Tabs 组件

基于 Radix UI 的选项卡组件，支持水平和垂直布局。

**水平布局（默认）：**
```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs'

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">标签1</TabsTrigger>
    <TabsTrigger value="tab2">标签2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">内容1</TabsContent>
  <TabsContent value="tab2">内容2</TabsContent>
</Tabs>
```

**垂直侧边栏布局（配置工具页）：**
```tsx
<Tabs
  value={activeTab}
  onValueChange={setActiveTab}
  className="grid grid-cols-[200px_1fr] gap-8"
>
  <TabsList className="sticky top-24 flex h-fit max-h-[calc(100vh-6rem)] flex-col gap-2 self-start overflow-y-auto rounded-md border border-neutral-200 bg-white p-2">
    <TabsTrigger
      value="config"
      className="justify-start rounded-md px-3 py-2 text-sm font-medium text-neutral-600 transition data-[state=active]:bg-neutral-900 data-[state=active]:text-white"
    >
      系统配置
    </TabsTrigger>
  </TabsList>
  <div className="space-y-6">
    <TabsContent value="config" className="mt-0">
      {/* 配置内容 */}
    </TabsContent>
  </div>
</Tabs>
```

**样式规范：**
```css
TabsList (水平):
  inline-flex h-10 items-center justify-center
  rounded-md border border-neutral-200 bg-neutral-50 p-1

TabsList (垂直):
  flex flex-col gap-2 p-2 bg-white border

TabsTrigger:
  inline-flex min-w-[120px] items-center justify-center
  rounded-sm px-3 py-1 text-sm font-medium transition-colors
  data-[state=active]:bg-white data-[state=active]:text-neutral-900
  data-[state=active]:shadow-sm

TabsContent:
  mt-6 focus-visible:outline-none
```

---

### 5. 表单元素

#### 文本输入框

```tsx
<input
  type="text"
  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
  placeholder="请输入..."
/>
```

#### 下拉选择框

```tsx
<select
  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
>
  <option value="1">选项1</option>
  <option value="2">选项2</option>
</select>
```

#### 标签

```tsx
<label className="text-sm font-medium text-neutral-700">
  字段名称
</label>
```

#### 辅助文字

```tsx
<p className="text-xs text-neutral-500">
  这是一段说明文字
</p>
```

---

## 常用模式

### 1. 按钮组（单选模式）

用于互斥选项选择，如下载类型、压缩预设等。

```tsx
import { cn } from '~/lib/utils/cn'

const [selected, setSelected] = useState('option1')

<div className="grid gap-2 sm:grid-cols-3">
  {options.map((option) => (
    <button
      key={option.value}
      type="button"
      onClick={() => setSelected(option.value)}
      className={cn(
        'rounded-md border border-neutral-200 px-3 py-2 text-sm transition-colors',
        selected === option.value
          ? 'border-neutral-900 bg-neutral-900 text-white'
          : 'hover:border-neutral-300 hover:bg-neutral-100',
      )}
    >
      {option.label}
    </button>
  ))}
</div>
```

**特点：**
- 使用 `grid` 布局自动分配空间
- 选中状态：黑色背景 + 白色文字
- 未选中悬停：浅灰背景
- 响应式：小屏幕单列，大屏幕多列

---

### 2. 统计卡片网格

用于展示关键指标和数据汇总。

```tsx
<div className="grid gap-6 sm:grid-cols-5">
  {stats.map((item) => (
    <div
      key={item.label}
      className="space-y-2 rounded-md border border-neutral-200 p-4"
    >
      <span className="text-xs font-medium uppercase text-neutral-500">
        {item.label}
      </span>
      <div className="text-2xl font-semibold tracking-tight text-neutral-900">
        {item.value}
      </div>
    </div>
  ))}
</div>
```

---

### 3. 表格设计

```tsx
<div className="overflow-x-auto">
  <table className="w-full text-sm">
    <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
      <tr>
        <th className="px-5 py-3 text-left font-medium">列名</th>
      </tr>
    </thead>
    <tbody>
      <tr className="border-b border-neutral-100 last:border-0">
        <td className="px-5 py-4 text-neutral-700">内容</td>
      </tr>
    </tbody>
  </table>
</div>
```

**样式要点：**
- 表头：浅灰背景 + 小写字母 + 边框
- 行间距：`px-5 py-4`
- 边框：`border-neutral-100` (非常浅)
- 最后一行无边框：`last:border-0`
- 响应式：外层 `overflow-x-auto`

---

### 4. 状态徽章

```tsx
const statusBadgeVariant =
  status === 'COMPLETED'
    ? 'success'
    : status === 'FAILED'
    ? 'danger'
    : 'outline'

<Badge variant={statusBadgeVariant}>{status}</Badge>
```

---

### 5. Toast 通知

```tsx
const [toast, setToast] = useState<{
  message: string
  tone?: 'default' | 'success' | 'error'
} | null>(null)

// 显示
{toast && (
  <div
    className={cn(
      'flex items-start justify-between gap-4 rounded-md border px-4 py-3 text-sm shadow-sm',
      toast.tone === 'error'
        ? 'border-red-200 bg-red-50 text-red-700'
        : toast.tone === 'success'
        ? 'border-green-200 bg-green-50 text-green-700'
        : 'border-neutral-200 bg-white text-neutral-600',
    )}
  >
    <span className="leading-relaxed">{toast.message}</span>
    <Button size="sm" variant="ghost" onClick={() => setToast(null)}>
      关闭
    </Button>
  </div>
)}

// 自动消失
useEffect(() => {
  if (!toast) return
  const timer = setTimeout(() => setToast(null), 4000)
  return () => clearTimeout(timer)
}, [toast])
```

---

### 6. 条件显示组件

```tsx
{sttProvider === 'google' && (
  <div className="space-y-2">
    <label htmlFor="googleSttLanguage" className="text-sm font-medium text-neutral-700">
      Google STT 语言
    </label>
    <select id="googleSttLanguage" {...props}>
      <option value="cmn-Hans-CN">简体中文</option>
      <option value="en-US">英语</option>
    </select>
  </div>
)}
```

---

### 7. 加载和禁用状态

```tsx
<Button
  disabled={isLoading}
  onClick={handleSubmit}
>
  {isLoading ? '处理中…' : '提交'}
</Button>
```

**禁用状态自动应用：**
```css
disabled:pointer-events-none disabled:opacity-50
```

---

## 响应式设计

### 断点系统

使用 Tailwind 默认断点：

```css
/* 默认：移动端优先 (<640px) */
sm:   640px   /* 小屏幕 */
md:   768px   /* 中等屏幕 */
lg:   1024px  /* 大屏幕 */
xl:   1280px  /* 超大屏幕 */
2xl:  1536px  /* 超超大屏幕 */
```

### 常用响应式模式

**网格列数：**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
```

**弹性布局方向：**
```tsx
<div className="flex flex-col sm:flex-row gap-3">
```

**文字对齐：**
```tsx
<div className="text-center sm:text-left">
```

**隐藏/显示：**
```tsx
<div className="hidden md:block">  {/* 小屏隐藏 */}
<div className="block md:hidden">  {/* 大屏隐藏 */}
```

---

## 辅助工具

### cn() 函数

用于合并 Tailwind 类名，避免冲突。

**位置：** `src/lib/utils/cn.ts`

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**使用示例：**
```tsx
import { cn } from '~/lib/utils/cn'

<div
  className={cn(
    'base-class',
    isActive && 'active-class',
    className  // 外部传入的类名
  )}
/>
```

**为什么使用 cn()：**
- 自动去重和合并冲突的 Tailwind 类
- 支持条件类名
- 保证类名优先级正确

---

### CVA（Class Variance Authority）

用于创建可复用的变体组件。

**示例：**
```typescript
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  // 基础样式（总是应用）
  'inline-flex items-center justify-center rounded-md font-medium',
  {
    variants: {
      // 变体维度1：视觉样式
      variant: {
        default: 'bg-black text-white',
        outline: 'border bg-white',
      },
      // 变体维度2：尺寸
      size: {
        sm: 'h-8 px-3 text-xs',
        lg: 'h-11 px-5 text-base',
      },
    },
    // 默认值
    defaultVariants: {
      variant: 'default',
      size: 'sm',
    },
  },
)

// 使用
<button className={buttonVariants({ variant: 'outline', size: 'lg' })}>
  点击
</button>
```

---

## 最佳实践

### 1. 组件组合而非重复

**推荐：**
```tsx
// 提取可复用的字段容器
function FormField({ label, description, children }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-neutral-700">
        {label}
      </label>
      {children}
      {description && (
        <p className="text-xs text-neutral-500">{description}</p>
      )}
    </div>
  )
}

// 使用
<FormField label="视频 URL" description="支持 YouTube、Bilibili">
  <input type="url" />
</FormField>
```

---

### 2. 保持样式一致性

**使用已定义的组件：**
```tsx
// ✅ 推荐
<Button variant="outline">取消</Button>

// ❌ 不推荐（重复样式代码）
<button className="border bg-white rounded-md px-4 py-2">取消</button>
```

---

### 3. 语义化的变体名称

```tsx
// ✅ 清晰的语义
variant: 'destructive'  // 危险操作
variant: 'outline'      // 轮廓样式

// ❌ 模糊的命名
variant: 'red'          // 只描述颜色
variant: 'style2'       // 无意义
```

---

### 4. 合理使用间距

**保持视觉层级：**
```tsx
<Card>
  <CardHeader>            {/* p-6 */}
    <CardTitle>...</CardTitle>
    <CardDescription>...</CardDescription>  {/* gap-2 */}
  </CardHeader>
  <CardContent className="space-y-6">  {/* 大区块间距 */}
    <div className="space-y-2">  {/* 字段内间距 */}
      <label />
      <input />
    </div>
  </CardContent>
</Card>
```

---

### 5. 可访问性

**键盘导航：**
```tsx
<button
  className="focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400"
>
```

**语义化 HTML：**
```tsx
<label htmlFor="email">邮箱</label>
<input id="email" type="email" />
```

**ARIA 属性：**
```tsx
<button aria-label="关闭" disabled={isDisabled}>
  ×
</button>
```

---

## 快速参考

### 常用颜色组合

| 场景 | 背景 | 边框 | 文字 |
|------|------|------|------|
| 主要内容 | `bg-white` | `border-neutral-200` | `text-neutral-900` |
| 次要背景 | `bg-neutral-50` | `border-neutral-100` | `text-neutral-700` |
| 成功提示 | `bg-green-50` | `border-green-200` | `text-green-700` |
| 错误提示 | `bg-red-50` | `border-red-200` | `text-red-700` |
| 信息提示 | `bg-blue-50` | `border-blue-200` | `text-blue-700` |

### 常用字号场景

| 元素 | 类名 | 像素 |
|------|------|------|
| 辅助文字 | `text-xs` | 12px |
| 表单标签 | `text-sm` | 14px |
| 正文 | `text-base` | 16px |
| 卡片标题 | `text-lg` | 18px |
| 区块标题 | `text-xl` | 20px |
| 页面标题 | `text-2xl` | 24px |

### 常用间距场景

| 场景 | 间距类 | 值 |
|------|--------|-----|
| 按钮组 | `gap-2` | 8px |
| 卡片内容 | `p-6` | 24px |
| 表单字段组 | `space-y-6` | 24px |
| 标签-输入框 | `space-y-2` | 8px |
| 网格间距 | `gap-4` | 16px |

---

## 总结

本项目的样式系统特点：

1. **中性色主导**：以灰度为主，语义色为辅
2. **简洁现代**：干净的设计，适度的圆角和阴影
3. **组件化**：可复用的 UI 组件库
4. **变体管理**：使用 CVA 管理样式变体
5. **响应式**：移动端优先的布局策略
6. **可维护**：一致的命名和模式

参考本指南可以快速搭建风格一致的界面，同时保持代码的可维护性和可扩展性。
