# 脚本数据查看器更新说明

## 更新内容

为Studio页面的"目标确定"Tab添加了智能JSON格式化展示功能。

## 主要功能

### 1. 智能JSON提取
- **自动裁剪**：从LLM返回的文本中自动提取JSON部分（从第一个`{`到最后一个`}`）
- **兼容性强**：支持处理带有说明文字的返回内容
- **保留原数据**：在"原始返回数据"区域展示完整的原始内容

### 2. 格式化展示

#### 核心信息卡片
- **风格设定** - 蓝色卡片（border-blue-200, bg-blue-50）
- **人文审美设定** - 紫色卡片（border-purple-200, bg-purple-50）
- **英语学习要点** - 绿色卡片（border-green-200, bg-green-50）

#### 镜头脚本列表
每个镜头独立展示，包含：
- 镜头编号和角色名称（灰色头部）
- **场景环境** - 琥珀色背景（bg-amber-50）
- **角色外观与动作** - 靛蓝色背景（bg-indigo-50）
- **台词** - 灰色背景，斜体引用样式

#### 原始数据区域
- 默认收起，减少视觉干扰
- 点击展开查看完整的原始返回数据
- 如果进行了JSON提取，会显示蓝色标签"已自动提取JSON"
- 展开时显示数据处理说明

### 3. 错误处理
- JSON解析失败时显示警告提示
- 优雅降级，显示原始文本内容
- 保证在任何情况下都能查看数据

## 使用场景

### 场景1：LLM返回纯JSON
```
{"styleSettings": "...", "aestheticSettings": "...", ...}
```
直接解析和格式化展示。

### 场景2：LLM返回带说明的JSON
```
根据您的要求，我生成了以下脚本：

{"styleSettings": "...", "aestheticSettings": "...", ...}

以上是生成的脚本内容。
```
自动提取中间的JSON部分，并在原始数据区域显示完整内容。

### 场景3：返回非JSON内容
```
抱歉，无法生成脚本...
```
显示警告，以原始文本形式展示。

## 技术实现

### 核心函数：extractJsonFromString
```typescript
function extractJsonFromString(str: string): string {
  const firstBrace = str.indexOf('{')
  const lastBrace = str.lastIndexOf('}')

  if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
    return str // 如果找不到有效的大括号，返回原字符串
  }

  return str.substring(firstBrace, lastBrace + 1)
}
```

### 测试覆盖
- ✅ 带前缀文字的JSON
- ✅ 带后缀文字的JSON
- ✅ 前后都有文字的JSON
- ✅ 纯JSON
- ✅ 没有JSON的文本

## 相关文件

- [src/components/studio/ScriptDataViewer.tsx](src/components/studio/ScriptDataViewer.tsx) - 新增的数据查看器组件
- [src/components/studio/ObjectiveTab.tsx](src/components/studio/ObjectiveTab.tsx) - 更新以使用数据查看器

## 用户体验改进

1. **数据清晰度提升**：结构化展示代替纯文本，信息层次分明
2. **容错性强**：智能处理各种返回格式，不会因格式问题导致显示失败
3. **编辑便捷**：保留小尺寸编辑框，支持手动调整
4. **透明度高**：可随时查看原始返回数据，便于调试
5. **视觉友好**：使用不同颜色区分不同类型信息，减少阅读疲劳
