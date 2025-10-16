# AI生成模块变更日志

## [2.0.0] - 2025-10-14

### 🎉 重大更新

全面重构和优化AI生成模块，提升稳定性、可扩展性和用户体验。

### ✨ 新增功能

#### 新增AI模型适配器 (4个)

- **OpenAI DALL-E 3** (`openai-dalle-adapter.ts`)
  - 支持文生图
  - 3种尺寸：1024x1024, 1792x1024, 1024x1792
  - 2种质量：standard, hd
  - 2种风格：vivid, natural
  - 同步生成，无需轮询

- **Pollo Veo 3** (`pollo-veo3-adapter.ts`)
  - Google Veo 3视频生成
  - 支持文生视频和图生视频
  - 固定16:9比例
  - 可选音频生成
  - 异步轮询支持

- **Pollo Kling 1.5** (`pollo-kling-adapter.ts`)
  - Kling 1.5图生视频
  - 支持多种比例：16:9, 9:16, 1:1
  - 镜头运动参数
  - URL格式输入图片

- **Kie Sora** (`kie-sora-adapter.ts`)
  - OpenAI Sora视频生成框架
  - 支持多种时长和分辨率
  - 待API正式开放后启用

#### 错误监控系统

- **ErrorLogService** (`error-log-service.ts`)
  - 三个错误级别：WARN, ERROR, CRITICAL
  - 错误统计和分析
  - 解决状态管理
  - 自动清理旧日志（保留30天）
  - 便捷方法：`logWarning()`, `logCriticalError()`, `logCritical()`

- **SystemAlertService** (`system-alert-service.ts`)
  - 四个严重级别：LOW, MEDIUM, HIGH, CRITICAL
  - 预定义告警类型：
    - ERROR_RATE_HIGH - 错误率过高
    - TASK_TIMEOUT - 任务超时
    - API_DOWN - API不可用
    - QUOTA_EXHAUSTED - 配额耗尽
  - 告警确认机制
  - 告警统计分析
  - 可扩展通知渠道

#### 参数验证系统

- **Parameter Schemas** (`parameter-schemas.ts`)
  - 使用Zod为12个模型定义严格验证
  - 类型安全的参数验证
  - 默认值自动填充
  - 前后端验证一致
  - 详细的错误信息
  - 导出TypeScript类型定义

#### 结果存储服务

- **ResultStorageService** (`result-storage-service.ts`)
  - 统一的结果处理接口
  - 可选S3自动上传
  - 上传失败回退机制
  - 保留原始URL
  - 路径前缀配置
  - 批量删除S3文件

#### 健康检查服务

- **HealthCheckService** (`health-check-service.ts`)
  - 供应商可用性检测
  - API Key有效性验证
  - 响应时间测量
  - 配额查询接口（预留）
  - 自动告警集成
  - 环境变量检测

#### 外部REST API

- `POST /api/external/ai-generation` - 创建生成任务
- `GET /api/external/ai-generation/tasks/[id]` - 查询任务状态
- `GET /api/external/ai-generation/models` - 获取可用模型列表

#### UI组件

- **Toast通知组件** (`toast.tsx`)
  - 4种类型：success, error, warning, info
  - 自动消失
  - 平滑动画
  - 可配置位置

- **任务详情页面** (`tasks/[id]/page.tsx`)
  - 完整的任务信息展示
  - 实时状态更新（自动刷新）
  - 进度条显示
  - 输入图片预览
  - 生成结果展示
  - 图片/视频播放
  - URL复制功能

### 🔄 改进优化

#### 异步轮询机制

- ✅ 添加超时控制（最长30分钟）
- ✅ 错误重试机制（连续失败3次自动终止）
- ✅ 完整的错误日志和告警集成
- ✅ 任务状态自动管理
- ✅ 详细的轮询日志
- ✅ 适配器支持检查

#### BaseAdapter增强

- ✅ 自动记录warn和error级别日志
- ✅ 异步错误日志记录，不阻塞主流程
- ✅ 包含上下文信息和堆栈跟踪

#### 数据库Schema

- ✅ 字段重命名：`encryptedApiKey` → `apiKey`
- ✅ 添加注释说明明文存储
- ✅ 新增S3配置字段：
  - `uploadToS3` - 是否自动上传到S3
  - `s3PathPrefix` - S3路径前缀

### 🗑️ 删除内容

#### 清理旧代码

- ❌ 删除旧generation router (`src/server/api/routers/generation.ts`)
- ❌ 删除旧适配器目录 (`src/lib/adapters/`)
- ❌ 删除旧外部API (`src/app/api/external/generation/`)
- ❌ 删除备份文件夹 (`_backup_ai_generation/`)
- ❌ 删除旧管理页面 (`src/app/admin/generation/`)

### 📝 文档

#### 新增文档

- `QUICK_START_AI_GENERATION.md` - 快速开始指南
- `AI_GENERATION_FINAL_REPORT.md` - 完整功能报告
- `AI_GENERATION_OPTIMIZATION_SUMMARY.md` - 优化总结
- `MIGRATION_TO_NEW_AI_GENERATION.md` - 迁移指南
- `SEED_AI_GENERATION_MODELS.md` - Seed脚本说明
- `AI_GENERATION_README.md` - AI模块使用说明

#### 新增脚本

- `scripts/setup-ai-generation.sh` - 一键安装脚本
- `npm run ai:setup` - 快捷安装命令
- `npm run db:seed` - Seed脚本命令

### 🔧 配置变更

#### Package.json

```json
{
  "scripts": {
    "db:seed": "npx tsx prisma/seed-ai-generation.ts",
    "ai:setup": "bash scripts/setup-ai-generation.sh"
  }
}
```

#### Prisma Schema

```prisma
model AIProvider {
  // 字段重命名
  - encryptedApiKey String?
  + apiKey          String?  // 明文存储
  
  // 新增字段
  + uploadToS3      Boolean  @default(false)
  + s3PathPrefix    String?
}
```

### 🚨 破坏性变更

#### API变更

**旧API（已删除）:**
- `POST /api/external/generation`

**新API:**
- `POST /api/external/ai-generation`
- `GET /api/external/ai-generation/tasks/[id]`
- `GET /api/external/ai-generation/models`

#### tRPC Router

**旧Router（已删除）:**
- `generation.*`

**新Router:**
- `aiGeneration.*`

#### 环境变量

**命名规范更新:**
```bash
# 旧格式（已弃用）
PROVIDER_API_KEY=xxx

# 新格式
AI_PROVIDER_{SLUG}_API_KEY=xxx
```

**示例:**
```bash
AI_PROVIDER_OPENAI_API_KEY=sk-xxx
AI_PROVIDER_POLLO_API_KEY=xxx
AI_PROVIDER_KIE_AI_API_KEY=xxx
```

### 📊 统计数据

- **新增文件:** 17个
- **修改文件:** 10个
- **删除目录:** 5个
- **新增代码:** ~3,500行
- **删除代码:** ~1,200行
- **净增代码:** ~2,300行

### 🔍 技术栈

- TypeScript
- Next.js 14
- Prisma ORM
- tRPC
- Zod
- React Query
- Tailwind CSS

### 🎯 下一步计划

#### P2级别优化（可选）

- [ ] 完善测试覆盖 - 单元测试、集成测试、E2E测试
- [ ] 优化日志系统 - 使用pino、请求追踪、脱敏
- [ ] 完善类型安全 - 减少any/unknown使用
- [ ] 数据库查询优化 - 游标分页、索引、缓存

#### 功能扩展

- [ ] 添加更多AI供应商
- [ ] 实现通知渠道（Email, Webhook, Slack）
- [ ] 批量操作功能
- [ ] 统计分析面板
- [ ] 提示词管理
- [ ] 权限控制

### 🐛 已知问题

- Kie Sora适配器框架已就绪，但API尚未公开，默认禁用
- S3上传需要配置火山引擎凭证
- 健康检查服务暂不支持配额查询（大多数供应商不提供此API）

### 📞 支持

如有问题：
1. 查看快速开始指南：`doc/QUICK_START_AI_GENERATION.md`
2. 查看完整报告：`doc/AI_GENERATION_FINAL_REPORT.md`
3. 查看迁移指南：`doc/MIGRATION_TO_NEW_AI_GENERATION.md`
4. 查看错误日志：Prisma Studio → ErrorLog表
5. 查看系统告警：Prisma Studio → SystemAlert表

---

## [1.0.0] - 2024-XX-XX

### 初始版本

- 基础AI生成功能
- 支持Kie.ai, TuZi, Replicate
- 简单的适配器系统
- 基础的任务管理

---

**版本:** v2.0.0  
**发布日期:** 2025-10-14  
**维护者:** AI Assistant

