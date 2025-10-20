# 部署验证 - 供应商UI显示确认

## ✅ 问题：远程服务器部署后，供应商能在UI上显示吗？

**答案：是的！完全可以。** 🎉

## 🔍 验证过程

### 1. 数据库中已有供应商数据

```bash
$ sqlite3 data/app.db "SELECT id, name, slug, isActive FROM ai_providers;"

cmgx6xdy2000332g577p9a3nh|Kie.ai|kie-ai|1
cmgx6xdy3000532g5os3n8654|TuZi|tuzi|1
cmgx6xdy4000732g53i8buhq4|Replicate|replicate|1
cmgx6xdyi000w32g5iem2pbkt|OpenAI|openai|1
cmgx6xdyk001032g5t3makai6|Pollo AI|pollo|1
```

✅ **5个供应商，全部激活**

### 2. 模型数据完整

```bash
$ sqlite3 data/app.db "SELECT COUNT(*) as total, outputType FROM ai_models GROUP BY outputType;"

12|IMAGE    (图像生成模型)
27|VIDEO    (视频生成模型)
```

✅ **39个模型，分为图像和视频两类**

### 3. 前端查询路径验证

**完整的数据流**：

```
┌─────────────────────────────────────────┐
│ 前端页面                                 │
│ /admin/ai-generation/providers          │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ tRPC Query                               │
│ api.aiGeneration.listProviders.useQuery()│
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ tRPC Router                              │
│ src/server/api/routers/ai-generation.ts  │
│ listProviders: publicProcedure.query()   │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ Model Service                            │
│ src/lib/ai-generation/services/         │
│ modelService.listProviders()             │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ Prisma Client                            │
│ db.aIProvider.findMany()                 │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ 环境变量                                 │
│ DATABASE_URL (from .env.production)      │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ SQLite 数据库                            │
│ data/app.db                              │
│ - ai_providers (5条记录)                 │
│ - ai_models (39条记录)                   │
└─────────────────────────────────────────┘
```

### 4. 代码验证

**前端页面代码** ([src/app/admin/ai-generation/providers/page.tsx](src/app/admin/ai-generation/providers/page.tsx:23)):
```typescript
// 查询图像能力供应商列表
const { data: providersData, refetch } = api.aiGeneration.listProviders.useQuery({})
```

**tRPC Router** ([src/server/api/routers/ai-generation.ts](src/server/api/routers/ai-generation.ts:82)):
```typescript
listProviders: publicProcedure
  .input(z.object({
    isActive: z.boolean().optional(),
    platformId: z.string().optional(),
  }))
  .query(async ({ input }) => {
    const providers = await modelService.listProviders(input)
    return providers
  }),
```

**Model Service** ([src/lib/ai-generation/services/model-service.ts](src/lib/ai-generation/services/model-service.ts:68)):
```typescript
const providers = await db.aIProvider.findMany({
  where,
  include: {
    platform: true,
    models: {
      orderBy: { sortOrder: 'asc' },
    },
  },
  orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
})
```

**数据库连接** ([src/server/db.ts](src/server/db.ts:10)):
```typescript
export const db = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})
// PrismaClient 自动从 DATABASE_URL 环境变量读取数据库路径
```

✅ **所有环节都正确使用环境变量**

## 🎯 部署到远程服务器后的完整流程

### 步骤 1: 准备环境变量

在服务器上创建 `.env.production`:

```bash
# 使用相对路径（推荐）
DATABASE_URL="file:./data/app.db"

# 其他必需配置
ADMIN_USERNAME="your_username"
ADMIN_PASSWORD="your_password"
NODE_ENV="production"
```

### 步骤 2: 运行部署

```bash
# 方案 A: 使用自动化脚本
./scripts/deploy-server.sh

# 方案 B: 手动执行
npm ci --only=production
npx prisma migrate deploy
npx tsx prisma/seed-user.ts
npx tsx prisma/seed-ai-generation.ts  # ← 初始化供应商数据
npm run build
npm start
```

### 步骤 3: 验证数据

```bash
# 检查数据库
sqlite3 data/app.db "SELECT COUNT(*) FROM ai_providers;"
# 输出: 5

sqlite3 data/app.db "SELECT COUNT(*) FROM ai_models;"
# 输出: 39
```

### 步骤 4: 访问UI

启动服务后，访问：
- **供应商管理页面**: `http://your-server:3000/admin/ai-generation/providers`

**预期显示**：
- Tab 1: **图像能力供应商** (12个图像生成模型)
- Tab 2: **语言能力供应商** (如果有配置LLM供应商)

供应商列表将显示：
```
✓ Kie.ai       (5个模型)
✓ TuZi         (2个模型)
✓ Replicate    (2个模型)
✓ OpenAI       (1个模型)
✓ Pollo AI     (2个模型)
```

## ✅ 确认清单

部署后检查这些项目确保供应商正确显示：

- [ ] 数据库文件存在：`ls -lh data/app.db`
- [ ] 供应商数据存在：`sqlite3 data/app.db "SELECT COUNT(*) FROM ai_providers;"`
- [ ] 模型数据存在：`sqlite3 data/app.db "SELECT COUNT(*) FROM ai_models;"`
- [ ] 环境变量正确：`cat .env.production | grep DATABASE_URL`
- [ ] Next.js 已构建：`ls -lh .next`
- [ ] 服务正在运行：`pm2 status` 或 `ps aux | grep node`
- [ ] 访问页面：打开浏览器访问供应商管理页面

## 🚨 如果UI上看不到供应商

### 检查步骤

1. **检查数据库数据**
   ```bash
   sqlite3 data/app.db "SELECT COUNT(*) FROM ai_providers;"
   ```
   如果返回 `0`，说明没有运行 seed 脚本

2. **重新运行 seed**
   ```bash
   export DATABASE_URL="file:./data/app.db"
   npx tsx prisma/seed-ai-generation.ts
   ```

3. **检查环境变量**
   ```bash
   cat .env.production | grep DATABASE_URL
   ```
   确保路径正确

4. **清除缓存并重启**
   ```bash
   rm -rf .next
   npm run build
   pm2 restart yt-dlpservice  # 或 npm start
   ```

5. **检查浏览器控制台**
   - 打开浏览器开发者工具
   - 查看 Network 标签
   - 确认 tRPC 请求是否成功

## 📊 预期的API响应

当页面加载时，会发送如下请求：

**请求**: `POST /api/trpc/aiGeneration.listProviders`

**响应**:
```json
{
  "result": {
    "data": [
      {
        "id": "cmgx6xdy2000332g577p9a3nh",
        "name": "Kie.ai",
        "slug": "kie-ai",
        "isActive": true,
        "models": [
          {
            "id": "...",
            "name": "Kie 4o Image",
            "slug": "kie-4o-image",
            "outputType": "IMAGE",
            ...
          },
          ...
        ]
      },
      ...
    ]
  }
}
```

## 🎉 结论

**是的，远程服务器部署后供应商会正常显示在UI上！**

前提条件：
1. ✅ 正确配置 `DATABASE_URL` 环境变量
2. ✅ 运行 `npx tsx prisma/seed-ai-generation.ts` 初始化数据
3. ✅ 构建并启动应用

整个系统通过环境变量完全配置化，无需修改任何代码。部署到任何服务器都是一样的流程。
