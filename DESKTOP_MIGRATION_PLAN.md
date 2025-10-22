# YT-DLP Desktop 桌面端迁移技术方案

> **目标**：将媒体浏览器和AI生成模块提取为 macOS 桌面应用
> **技术栈**：Tauri 2.0 + React + Rust
> **预计工期**：22-33 工作日

---

## 📋 目录

- [技术选型](#技术选型)
- [架构设计](#架构设计)
- [Phase 1: 项目架构搭建](#phase-1-项目架构搭建)
- [Phase 2: 媒体浏览器迁移](#phase-2-媒体浏览器迁移)
- [Phase 3: AI生成模块迁移](#phase-3-ai生成模块迁移)
- [Phase 4: 文件系统优化](#phase-4-文件系统优化)
- [Phase 5: 性能优化](#phase-5-性能优化视频编辑准备)
- [Phase 6: 打包和分发](#phase-6-打包和分发)
- [时间表](#完整迁移时间表)
- [风险评估](#风险评估)

---

## 🎯 技术选型

### 方案对比

| 维度 | Tauri 2.0 ⭐️ | Electron | Swift Catalyst |
|------|-----------|----------|----------------|
| **包体积** | ~10MB | ~150MB | ~5MB |
| **内存占用** | ~50MB | ~200MB | ~30MB |
| **启动速度** | 0.5s | 2-3s | 0.3s |
| **视频编辑性能** | ⭐️⭐️⭐️⭐️⭐️ | ⭐️⭐️⭐️ | ⭐️⭐️⭐️⭐️⭐️ |
| **原生API访问** | ✅ Rust FFI | ❌ | ✅ |
| **GPU加速** | ✅ Metal | ⚠️ 受限 | ✅ Metal |
| **代码复用** | 90% | 95% | 40% |
| **学习曲线** | 中 | 低 | 高 |
| **FFmpeg集成** | ✅ 原生 | ✅ 子进程 | ✅ 原生 |

### 推荐方案：Tauri 2.0

**选择理由：**

1. **性能最优**
   - 启动速度快（0.5秒）
   - 内存占用小（~50MB）
   - 原生 Metal GPU 加速

2. **未来视频编辑支持**
   - 直接调用 AVFoundation
   - Metal 着色器支持
   - 高性能视频解码/编码

3. **包体积小**
   - DMG 包：~15MB
   - 无需打包 Chromium

4. **macOS 原生体验**
   - 原生窗口控件
   - Touch Bar 支持
   - 系统通知集成
   - Finder 集成

5. **安全性**
   - Rust 内存安全
   - 细粒度权限控制
   - API 密钥本地加密存储

---

## 🏗️ 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────┐
│                   React Frontend                    │
│              (95% 复用现有代码)                      │
│  ┌─────────────────┐  ┌──────────────────────┐     │
│  │ Media Browser   │  │  AI Generation       │     │
│  │ - 媒体浏览器    │  │  - 任务管理          │     │
│  │ - 文件夹管理    │  │  - 模型选择          │     │
│  │ - 标签系统      │  │  - Studio 工作流     │     │
│  └─────────────────┘  └──────────────────────┘     │
└──────────────────┬──────────────────────────────────┘
                   │ Tauri IPC (invoke)
┌──────────────────▼──────────────────────────────────┐
│                  Rust Backend                       │
│                  (Tauri Core)                       │
│  ┌─────────────────────────────────────────────┐   │
│  │         IPC Commands Layer                  │   │
│  │  - media.rs  - ai_gen.rs  - database.rs    │   │
│  └──────────────────┬──────────────────────────┘   │
│  ┌──────────────────▼──────────────────────────┐   │
│  │         Services Layer                      │   │
│  │  - MediaManager                             │   │
│  │  - AIAdapter (45+ 模型)                     │   │
│  │  - ThumbnailGenerator                       │   │
│  │  - TaskPoller (异步任务轮询)               │   │
│  │  - FileWatcher                              │   │
│  └──────────────────┬──────────────────────────┘   │
│  ┌──────────────────▼──────────────────────────┐   │
│  │         Database Layer (Diesel ORM)         │   │
│  │  - SQLite (本地存储)                        │   │
│  │  - Models & Schema                          │   │
│  └──────────────────┬──────────────────────────┘   │
│  ┌──────────────────▼──────────────────────────┐   │
│  │         System Integration                  │   │
│  │  - FFmpeg (视频处理)                        │   │
│  │  - yt-dlp (视频下载)                        │   │
│  │  - reqwest (HTTP Client)                    │   │
│  │  - AVFoundation (macOS 视频 API)           │   │
│  │  - Metal (GPU 加速)                         │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 技术栈详细

**前端层：**
- React 19 + TypeScript
- TanStack Query (React Query)
- Tailwind CSS + Radix UI
- Tauri API (`@tauri-apps/api`)

**后端层（Rust）：**
- Tauri 2.0
- Diesel (ORM)
- tokio (异步运行时)
- reqwest (HTTP 客户端)
- serde (序列化/反序列化)
- rusqlite (SQLite 驱动)

**外部依赖：**
- FFmpeg (视频处理)
- yt-dlp (视频下载)
- SQLite (数据库)

---

## Phase 1: 项目架构搭建

**时间：3-5天**
**复杂度：中**

### 1.1 项目结构

```
yt-dlp-desktop/
├── src-tauri/              # Rust 后端
│   ├── src/
│   │   ├── main.rs         # 主进程
│   │   ├── commands/       # IPC命令处理
│   │   │   ├── mod.rs
│   │   │   ├── media.rs    # 媒体浏览器命令
│   │   │   ├── ai_gen.rs   # AI生成命令
│   │   │   ├── studio.rs   # Studio工作流命令
│   │   │   └── database.rs # 数据库操作
│   │   ├── services/       # 业务逻辑层
│   │   │   ├── mod.rs
│   │   │   ├── media_manager.rs
│   │   │   ├── ai_adapter/
│   │   │   │   ├── mod.rs
│   │   │   │   ├── base.rs
│   │   │   │   ├── kie.rs
│   │   │   │   ├── openai.rs
│   │   │   │   ├── replicate.rs
│   │   │   │   └── ... (45+ 适配器)
│   │   │   ├── thumbnail_generator.rs
│   │   │   ├── task_poller.rs
│   │   │   └── file_watcher.rs
│   │   ├── db/             # 数据库层
│   │   │   ├── mod.rs
│   │   │   ├── schema.rs   # Diesel schema
│   │   │   ├── models.rs
│   │   │   └── connection.rs
│   │   ├── utils/
│   │   │   ├── mod.rs
│   │   │   ├── paths.rs    # 统一路径管理
│   │   │   ├── ffmpeg.rs   # FFmpeg封装
│   │   │   └── crypto.rs   # API密钥加密
│   │   └── state.rs        # 全局状态管理
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── migrations/         # Diesel migrations
│   └── resources/          # 打包资源
│       ├── ffmpeg
│       └── yt-dlp
│
├── src/                    # React 前端（复用现有）
│   ├── app/
│   │   ├── media-browser/  # ✅ 直接复用
│   │   └── ai-generation/  # ✅ 直接复用
│   ├── components/         # ✅ 直接复用
│   ├── hooks/              # ⚠️ 需改造
│   │   └── tauri/          # 新增：Tauri专用hooks
│   ├── lib/
│   │   └── tauri-client.ts # 新增：Tauri IPC客户端
│   └── types/              # ✅ 直接复用
│
├── package.json
├── tsconfig.json
└── README.md
```

### 1.2 Cargo.toml 依赖

```toml
[package]
name = "yt-dlp-desktop"
version = "1.0.0"
edition = "2021"

[dependencies]
# Tauri 核心
tauri = { version = "2.0", features = ["shell-open"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# 数据库
diesel = { version = "2.1", features = ["sqlite", "r2d2"] }
diesel_migrations = "2.1"

# 异步运行时
tokio = { version = "1", features = ["full"] }

# HTTP 客户端
reqwest = { version = "0.11", features = ["json", "multipart"] }

# 工具类
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1.0", features = ["v4", "serde"] }
anyhow = "1.0"
thiserror = "1.0"

# 加密
ring = "0.17"
base64 = "0.21"

# 日志
log = "0.4"
env_logger = "0.11"

[features]
default = ["custom-protocol"]
custom-protocol = ["tauri/custom-protocol"]
```

### 1.3 数据库迁移（Prisma → Diesel）

**Diesel Schema 示例：**

```rust
// src-tauri/src/db/schema.rs

table! {
    media_files (id) {
        id -> Text,
        name -> Text,
        remark -> Nullable<Text>,
        file_type -> Text,          // IMAGE | VIDEO | AUDIO
        source -> Text,             // LOCAL | URL | LOCAL_REF
        source_url -> Nullable<Text>,
        local_path -> Nullable<Text>,
        original_path -> Nullable<Text>,
        thumbnail_path -> Nullable<Text>,
        file_size -> Nullable<Integer>,
        mime_type -> Nullable<Text>,
        width -> Nullable<Integer>,
        height -> Nullable<Integer>,
        duration -> Nullable<Real>,
        folder_id -> Nullable<Text>,
        actor_id -> Nullable<Text>,
        starred -> Bool,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

table! {
    media_folders (id) {
        id -> Text,
        name -> Text,
        color -> Nullable<Text>,
        icon -> Nullable<Text>,
        sort_order -> Integer,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

table! {
    media_actors (id) {
        id -> Text,
        name -> Text,
        avatar_url -> Nullable<Text>,
        reference_image_url -> Nullable<Text>,
        bio -> Nullable<Text>,
        appearance_prompt -> Nullable<Text>,
        tags -> Nullable<Text>,
        sort_order -> Integer,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

table! {
    media_tags (id) {
        id -> Text,
        name -> Text,
        color -> Text,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

table! {
    ai_generation_tasks (id) {
        id -> Text,
        model_id -> Text,
        prompt -> Text,
        input_images -> Nullable<Text>,
        number_of_outputs -> Integer,
        parameters -> Nullable<Text>,
        status -> Text,
        progress -> Nullable<Real>,
        results -> Nullable<Text>,
        error_message -> Nullable<Text>,
        provider_task_id -> Nullable<Text>,
        duration_ms -> Nullable<Integer>,
        shot_id -> Nullable<Text>,
        created_at -> Timestamp,
        updated_at -> Timestamp,
        completed_at -> Nullable<Timestamp>,
    }
}

// ... 其他表类似
```

**Models 示例：**

```rust
// src-tauri/src/db/models.rs

use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Queryable, Insertable, Serialize, Deserialize)]
#[diesel(table_name = media_files)]
pub struct MediaFile {
    pub id: String,
    pub name: String,
    pub remark: Option<String>,
    pub file_type: String,
    pub source: String,
    pub source_url: Option<String>,
    pub local_path: Option<String>,
    pub original_path: Option<String>,
    pub thumbnail_path: Option<String>,
    pub file_size: Option<i32>,
    pub mime_type: Option<String>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub duration: Option<f64>,
    pub folder_id: Option<String>,
    pub actor_id: Option<String>,
    pub starred: bool,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Insertable)]
#[diesel(table_name = media_files)]
pub struct NewMediaFile {
    pub id: String,
    pub name: String,
    pub file_type: String,
    pub source: String,
    pub starred: bool,
}
```

### 1.4 数据库连接池

```rust
// src-tauri/src/db/connection.rs

use diesel::prelude::*;
use diesel::r2d2::{self, ConnectionManager};
use tauri::api::path::app_data_dir;
use std::path::PathBuf;

pub type DbPool = r2d2::Pool<ConnectionManager<SqliteConnection>>;
pub type DbConnection = r2d2::PooledConnection<ConnectionManager<SqliteConnection>>;

pub fn establish_connection(config: &tauri::Config) -> DbPool {
    let db_path = get_database_path(config);
    let database_url = db_path.to_str().unwrap();

    let manager = ConnectionManager::<SqliteConnection>::new(database_url);
    r2d2::Pool::builder()
        .max_size(15)
        .build(manager)
        .expect("Failed to create pool")
}

fn get_database_path(config: &tauri::Config) -> PathBuf {
    app_data_dir(config)
        .unwrap()
        .join("yt-dlp-desktop")
        .join("app.db")
}
```

### 1.5 全局状态管理

```rust
// src-tauri/src/state.rs

use crate::db::DbPool;
use crate::utils::paths::PathManager;
use std::sync::Mutex;

pub struct AppState {
    pub db_pool: DbPool,
    pub paths: PathManager,
    pub api_keys: Mutex<ApiKeyStore>,
}

pub struct ApiKeyStore {
    pub kie_api_key: Option<String>,
    pub openai_api_key: Option<String>,
    pub replicate_api_key: Option<String>,
    // ... 其他API密钥
}

impl AppState {
    pub fn new(config: &tauri::Config) -> Self {
        let db_pool = crate::db::establish_connection(config);
        let paths = PathManager::new(config);

        // 确保目录存在
        paths.ensure_dirs().expect("Failed to create directories");

        Self {
            db_pool,
            paths,
            api_keys: Mutex::new(ApiKeyStore::default()),
        }
    }
}
```

### 1.6 主进程入口

```rust
// src-tauri/src/main.rs

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;
mod services;
mod state;
mod utils;

use state::AppState;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // 初始化全局状态
            let state = AppState::new(app.config());
            app.manage(state);

            // 运行数据库迁移
            // diesel_migrations::run_pending_migrations(&state.db_pool.get().unwrap())
            //     .expect("Failed to run migrations");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // 媒体浏览器命令
            commands::media::list_media_files,
            commands::media::get_media_file,
            commands::media::add_local_files,
            commands::media::add_url,
            commands::media::update_file,
            commands::media::delete_file,
            commands::media::list_folders,
            commands::media::create_folder,
            commands::media::list_actors,
            commands::media::create_actor,
            // AI生成命令
            commands::ai_gen::list_providers,
            commands::ai_gen::list_models,
            commands::ai_gen::generate,
            commands::ai_gen::get_task,
            commands::ai_gen::list_tasks,
            // ... 更多命令
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

## Phase 2: 媒体浏览器迁移

**时间：5-7天**
**复杂度：中**

### 2.1 IPC 命令实现

#### 文件列表查询

```rust
// src-tauri/src/commands/media.rs

use tauri::State;
use crate::state::AppState;
use crate::services::media_manager::MediaManager;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct MediaFilter {
    pub folder_id: Option<String>,
    pub actor_id: Option<String>,
    pub file_types: Option<Vec<String>>,
    pub source: Option<String>,
    pub starred: Option<bool>,
    pub search_query: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct MediaFileList {
    pub files: Vec<MediaFile>,
    pub total: i64,
    pub has_more: bool,
}

#[tauri::command]
pub async fn list_media_files(
    state: State<'_, AppState>,
    filter: MediaFilter,
    page: i32,
    page_size: i32,
) -> Result<MediaFileList, String> {
    let pool = &state.db_pool;

    MediaManager::list_files(pool, filter, page, page_size)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_media_file(
    state: State<'_, AppState>,
    file_id: String,
) -> Result<MediaFile, String> {
    let pool = &state.db_pool;

    MediaManager::get_file(pool, &file_id)
        .await
        .map_err(|e| e.to_string())
}
```

#### 添加本地文件

```rust
#[tauri::command]
pub async fn add_local_files(
    state: State<'_, AppState>,
    file_paths: Vec<String>,
) -> Result<Vec<MediaFile>, String> {
    let pool = &state.db_pool;
    let paths = &state.paths;

    MediaManager::add_local_files(pool, paths, file_paths)
        .await
        .map_err(|e| e.to_string())
}
```

#### 文件夹管理

```rust
#[tauri::command]
pub async fn list_folders(
    state: State<'_, AppState>,
) -> Result<Vec<MediaFolder>, String> {
    let pool = &state.db_pool;

    MediaManager::list_folders(pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_folder(
    state: State<'_, AppState>,
    name: String,
    color: Option<String>,
) -> Result<MediaFolder, String> {
    let pool = &state.db_pool;

    MediaManager::create_folder(pool, name, color)
        .await
        .map_err(|e| e.to_string())
}
```

### 2.2 媒体管理服务

```rust
// src-tauri/src/services/media_manager.rs

use diesel::prelude::*;
use crate::db::{DbPool, models::*, schema::*};
use crate::utils::paths::PathManager;
use crate::services::thumbnail_generator::ThumbnailGenerator;
use uuid::Uuid;
use chrono::Utc;

pub struct MediaManager;

impl MediaManager {
    pub async fn list_files(
        pool: &DbPool,
        filter: MediaFilter,
        page: i32,
        page_size: i32,
    ) -> Result<MediaFileList, anyhow::Error> {
        let mut conn = pool.get()?;

        let mut query = media_files::table.into_boxed();

        // 应用筛选
        if let Some(folder_id) = filter.folder_id {
            query = query.filter(media_files::folder_id.eq(folder_id));
        }

        if let Some(actor_id) = filter.actor_id {
            query = query.filter(media_files::actor_id.eq(actor_id));
        }

        if let Some(types) = filter.file_types {
            query = query.filter(media_files::file_type.eq_any(types));
        }

        if let Some(starred) = filter.starred {
            query = query.filter(media_files::starred.eq(starred));
        }

        // 分页
        let offset = (page - 1) * page_size;
        let files = query
            .order(media_files::created_at.desc())
            .limit(page_size as i64)
            .offset(offset as i64)
            .load::<MediaFile>(&mut conn)?;

        let total = media_files::table.count().get_result(&mut conn)?;

        Ok(MediaFileList {
            files,
            total,
            has_more: (offset + page_size) < total as i32,
        })
    }

    pub async fn add_local_files(
        pool: &DbPool,
        paths_manager: &PathManager,
        file_paths: Vec<String>,
    ) -> Result<Vec<MediaFile>, anyhow::Error> {
        let mut results = Vec::new();

        for path in file_paths {
            let file = Self::add_single_local_file(
                pool,
                paths_manager,
                &path
            ).await?;
            results.push(file);
        }

        Ok(results)
    }

    async fn add_single_local_file(
        pool: &DbPool,
        paths_manager: &PathManager,
        source_path: &str,
    ) -> Result<MediaFile, anyhow::Error> {
        use std::fs;
        use std::path::Path;

        let source = Path::new(source_path);
        let file_name = source.file_name()
            .and_then(|n| n.to_str())
            .ok_or_else(|| anyhow::anyhow!("Invalid file name"))?;

        // 生成唯一ID
        let file_id = Uuid::new_v4().to_string();

        // 复制文件到应用数据目录
        let dest_path = paths_manager.media_uploads.join(&file_id);
        fs::copy(source_path, &dest_path)?;

        // 获取文件元数据
        let metadata = fs::metadata(&dest_path)?;
        let file_size = metadata.len() as i32;

        // 检测文件类型
        let mime_type = mime_guess::from_path(source_path)
            .first()
            .map(|m| m.to_string());

        let file_type = Self::detect_file_type(&mime_type);

        // 生成缩略图（异步）
        let thumbnail_path = if file_type == "IMAGE" || file_type == "VIDEO" {
            ThumbnailGenerator::generate(
                paths_manager,
                &file_id,
                dest_path.to_str().unwrap(),
                &file_type,
            ).await.ok()
        } else {
            None
        };

        // 插入数据库
        let new_file = NewMediaFile {
            id: file_id.clone(),
            name: file_name.to_string(),
            file_type: file_type.clone(),
            source: "LOCAL".to_string(),
            local_path: Some(dest_path.to_str().unwrap().to_string()),
            thumbnail_path,
            file_size: Some(file_size),
            mime_type,
            starred: false,
            created_at: Utc::now().naive_utc(),
            updated_at: Utc::now().naive_utc(),
        };

        let mut conn = pool.get()?;
        diesel::insert_into(media_files::table)
            .values(&new_file)
            .execute(&mut conn)?;

        // 返回完整记录
        Self::get_file(pool, &file_id).await
    }

    fn detect_file_type(mime_type: &Option<String>) -> String {
        mime_type.as_ref()
            .and_then(|m| {
                if m.starts_with("image/") {
                    Some("IMAGE")
                } else if m.starts_with("video/") {
                    Some("VIDEO")
                } else if m.starts_with("audio/") {
                    Some("AUDIO")
                } else {
                    None
                }
            })
            .unwrap_or("UNKNOWN")
            .to_string()
    }
}
```

### 2.3 缩略图生成服务

```rust
// src-tauri/src/services/thumbnail_generator.rs

use crate::utils::{paths::PathManager, ffmpeg::FFmpegWrapper};
use std::path::Path;

pub struct ThumbnailGenerator;

impl ThumbnailGenerator {
    pub async fn generate(
        paths: &PathManager,
        file_id: &str,
        source_path: &str,
        file_type: &str,
    ) -> Result<String, anyhow::Error> {
        let thumbnail_name = format!("{}.jpg", file_id);
        let thumbnail_path = paths.thumbnails.join(&thumbnail_name);

        match file_type {
            "IMAGE" => {
                Self::generate_image_thumbnail(
                    source_path,
                    thumbnail_path.to_str().unwrap(),
                ).await?;
            }
            "VIDEO" => {
                Self::generate_video_thumbnail(
                    source_path,
                    thumbnail_path.to_str().unwrap(),
                ).await?;
            }
            _ => return Err(anyhow::anyhow!("Unsupported file type")),
        }

        Ok(thumbnail_path.to_str().unwrap().to_string())
    }

    async fn generate_image_thumbnail(
        source: &str,
        output: &str,
    ) -> Result<(), anyhow::Error> {
        // 使用 image crate 处理图片
        use image::ImageReader;

        let img = ImageReader::open(source)?.decode()?;
        let thumbnail = img.thumbnail(400, 400);
        thumbnail.save(output)?;

        Ok(())
    }

    async fn generate_video_thumbnail(
        source: &str,
        output: &str,
    ) -> Result<(), anyhow::Error> {
        FFmpegWrapper::generate_thumbnail(source, output).await
    }
}
```

### 2.4 前端适配

#### Tauri IPC 客户端封装

```typescript
// src/lib/tauri-client.ts

import { invoke } from '@tauri-apps/api/tauri';

export interface MediaFilter {
  folderId?: string;
  actorId?: string;
  fileTypes?: string[];
  source?: string;
  starred?: boolean;
  searchQuery?: string;
}

export interface MediaFile {
  id: string;
  name: string;
  remark?: string;
  fileType: string;
  source: string;
  sourceUrl?: string;
  localPath?: string;
  thumbnailPath?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  duration?: number;
  starred: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MediaFileList {
  files: MediaFile[];
  total: number;
  hasMore: boolean;
}

export class TauriMediaClient {
  async listMediaFiles(
    filter: MediaFilter,
    page: number = 1,
    pageSize: number = 30,
  ): Promise<MediaFileList> {
    return invoke('list_media_files', { filter, page, pageSize });
  }

  async getMediaFile(fileId: string): Promise<MediaFile> {
    return invoke('get_media_file', { fileId });
  }

  async addLocalFiles(filePaths: string[]): Promise<MediaFile[]> {
    return invoke('add_local_files', { filePaths });
  }

  async addUrl(url: string): Promise<MediaFile> {
    return invoke('add_url', { url });
  }

  async updateFile(
    fileId: string,
    updates: Partial<MediaFile>,
  ): Promise<MediaFile> {
    return invoke('update_file', { fileId, updates });
  }

  async deleteFile(fileId: string): Promise<void> {
    return invoke('delete_file', { fileId });
  }

  async listFolders(): Promise<MediaFolder[]> {
    return invoke('list_folders');
  }

  async createFolder(
    name: string,
    color?: string,
  ): Promise<MediaFolder> {
    return invoke('create_folder', { name, color });
  }

  // ... 更多方法
}

export const tauriClient = new TauriMediaClient();
```

#### React Hooks 改造

```typescript
// src/hooks/tauri/useMediaQueries.ts

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { tauriClient } from '@/lib/tauri-client';
import type { MediaFilter } from '@/lib/tauri-client';

export function useMediaFiles(filter: MediaFilter, pageSize = 30) {
  return useInfiniteQuery({
    queryKey: ['media-files', filter],
    queryFn: ({ pageParam = 1 }) =>
      tauriClient.listMediaFiles(filter, pageParam, pageSize),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length + 1 : undefined,
    staleTime: 30000, // 30秒
  });
}

export function useMediaFile(fileId: string) {
  return useQuery({
    queryKey: ['media-file', fileId],
    queryFn: () => tauriClient.getMediaFile(fileId),
    enabled: !!fileId,
  });
}

export function useFolders() {
  return useQuery({
    queryKey: ['media-folders'],
    queryFn: () => tauriClient.listFolders(),
    staleTime: 60000, // 1分钟
  });
}

// ... 更多hooks
```

#### Mutations 改造

```typescript
// src/hooks/tauri/useMediaMutations.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tauriClient } from '@/lib/tauri-client';

export function useAddLocalFiles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (filePaths: string[]) =>
      tauriClient.addLocalFiles(filePaths),
    onSuccess: () => {
      // 刷新文件列表
      queryClient.invalidateQueries({ queryKey: ['media-files'] });
    },
  });
}

export function useUpdateFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ fileId, updates }: {
      fileId: string;
      updates: Partial<MediaFile>
    }) => tauriClient.updateFile(fileId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['media-file', variables.fileId]
      });
      queryClient.invalidateQueries({
        queryKey: ['media-files']
      });
    },
  });
}

// ... 更多mutations
```

#### 文件选择对话框集成

```typescript
// src/hooks/tauri/useFileDialog.ts

import { open } from '@tauri-apps/api/dialog';

export function useFileDialog() {
  const selectFiles = async (options?: {
    multiple?: boolean;
    filters?: Array<{ name: string; extensions: string[] }>;
  }) => {
    const selected = await open({
      multiple: options?.multiple ?? false,
      filters: options?.filters ?? [
        { name: 'Media', extensions: ['jpg', 'png', 'mp4', 'mov'] },
      ],
    });

    if (Array.isArray(selected)) {
      return selected;
    } else if (selected) {
      return [selected];
    }
    return [];
  };

  const selectFolder = async () => {
    return await open({
      directory: true,
    });
  };

  return { selectFiles, selectFolder };
}
```

---

## Phase 3: AI生成模块迁移

**时间：7-10天**
**复杂度：高**

### 3.1 AI适配器架构

#### 基础适配器

```rust
// src-tauri/src/services/ai_adapter/base.rs

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use reqwest::Client;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationRequest {
    pub prompt: String,
    pub input_images: Option<Vec<String>>,
    pub number_of_outputs: Option<i32>,
    pub parameters: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationResult {
    pub r#type: String,  // IMAGE | VIDEO | AUDIO
    pub url: String,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdapterResponse {
    pub status: String,  // SUCCESS | PROCESSING | ERROR
    pub results: Option<Vec<GenerationResult>>,
    pub provider_task_id: Option<String>,
    pub progress: Option<f64>,
    pub message: Option<String>,
}

#[async_trait]
pub trait AIAdapter: Send + Sync {
    async fn dispatch(
        &self,
        request: GenerationRequest,
    ) -> Result<AdapterResponse, anyhow::Error>;

    async fn check_task_status(
        &self,
        task_id: &str,
    ) -> Result<AdapterResponse, anyhow::Error>;

    fn get_adapter_name(&self) -> &str;
}

pub struct BaseAdapter {
    pub client: Client,
    pub api_key: String,
}

impl BaseAdapter {
    pub fn new(api_key: String) -> Self {
        Self {
            client: Client::builder()
                .timeout(std::time::Duration::from_secs(120))
                .build()
                .unwrap(),
            api_key,
        }
    }
}
```

#### KIE 适配器示例

```rust
// src-tauri/src/services/ai_adapter/kie.rs

use super::base::*;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

pub struct KieFluxAdapter {
    base: BaseAdapter,
}

#[derive(Serialize)]
struct KieRequest {
    prompt: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    num_outputs: Option<i32>,
    #[serde(flatten)]
    parameters: serde_json::Value,
}

#[derive(Deserialize)]
struct KieResponse {
    task_id: Option<String>,
    status: String,
    images: Option<Vec<String>>,
}

impl KieFluxAdapter {
    pub fn new(api_key: String) -> Self {
        Self {
            base: BaseAdapter::new(api_key),
        }
    }
}

#[async_trait]
impl AIAdapter for KieFluxAdapter {
    async fn dispatch(
        &self,
        request: GenerationRequest,
    ) -> Result<AdapterResponse, anyhow::Error> {
        let kie_req = KieRequest {
            prompt: request.prompt,
            num_outputs: request.number_of_outputs,
            parameters: request.parameters.unwrap_or(serde_json::json!({})),
        };

        let response = self.base.client
            .post("https://api.kie.cn/v1/flux/generate")
            .header("Authorization", format!("Bearer {}", self.base.api_key))
            .json(&kie_req)
            .send()
            .await?
            .json::<KieResponse>()
            .await?;

        if let Some(task_id) = response.task_id {
            // 异步任务
            Ok(AdapterResponse {
                status: "PROCESSING".to_string(),
                results: None,
                provider_task_id: Some(task_id),
                progress: None,
                message: Some("Task submitted".to_string()),
            })
        } else if let Some(images) = response.images {
            // 同步返回
            Ok(AdapterResponse {
                status: "SUCCESS".to_string(),
                results: Some(
                    images.into_iter()
                        .map(|url| GenerationResult {
                            r#type: "IMAGE".to_string(),
                            url,
                            metadata: None,
                        })
                        .collect()
                ),
                provider_task_id: None,
                progress: None,
                message: None,
            })
        } else {
            Err(anyhow::anyhow!("Invalid response"))
        }
    }

    async fn check_task_status(
        &self,
        task_id: &str,
    ) -> Result<AdapterResponse, anyhow::Error> {
        let response = self.base.client
            .get(&format!("https://api.kie.cn/v1/tasks/{}", task_id))
            .header("Authorization", format!("Bearer {}", self.base.api_key))
            .send()
            .await?
            .json::<KieResponse>()
            .await?;

        match response.status.as_str() {
            "completed" => Ok(AdapterResponse {
                status: "SUCCESS".to_string(),
                results: response.images.map(|imgs| {
                    imgs.into_iter()
                        .map(|url| GenerationResult {
                            r#type: "IMAGE".to_string(),
                            url,
                            metadata: None,
                        })
                        .collect()
                }),
                provider_task_id: None,
                progress: Some(1.0),
                message: None,
            }),
            "failed" => Ok(AdapterResponse {
                status: "ERROR".to_string(),
                results: None,
                provider_task_id: None,
                progress: None,
                message: Some("Task failed".to_string()),
            }),
            _ => Ok(AdapterResponse {
                status: "PROCESSING".to_string(),
                results: None,
                provider_task_id: Some(task_id.to_string()),
                progress: Some(0.5),
                message: None,
            }),
        }
    }

    fn get_adapter_name(&self) -> &str {
        "kie-flux"
    }
}
```

#### 适配器工厂

```rust
// src-tauri/src/services/ai_adapter/mod.rs

mod base;
mod kie;
mod openai;
mod replicate;

use base::AIAdapter;
use std::sync::Arc;

pub struct AdapterFactory;

impl AdapterFactory {
    pub fn create(
        adapter_name: &str,
        api_key: String,
    ) -> Result<Arc<dyn AIAdapter>, anyhow::Error> {
        match adapter_name {
            "kie-flux" => Ok(Arc::new(kie::KieFluxAdapter::new(api_key))),
            "kie-sora" => Ok(Arc::new(kie::KieSoraAdapter::new(api_key))),
            "openai-dalle" => Ok(Arc::new(openai::DalleAdapter::new(api_key))),
            "replicate-flux" => Ok(Arc::new(replicate::FluxAdapter::new(api_key))),
            // ... 添加45+个适配器
            _ => Err(anyhow::anyhow!("Unknown adapter: {}", adapter_name)),
        }
    }
}
```

### 3.2 任务轮询服务

```rust
// src-tauri/src/services/task_poller.rs

use crate::services::ai_adapter::{AdapterFactory, base::AIAdapter};
use crate::db::DbPool;
use tauri::Window;
use tokio::time::{interval, Duration};
use std::sync::Arc;

pub struct TaskPoller;

impl TaskPoller {
    pub async fn poll_async_task(
        window: Window,
        db_pool: DbPool,
        task_id: String,
        provider_task_id: String,
        adapter: Arc<dyn AIAdapter>,
    ) {
        let mut interval = interval(Duration::from_secs(5));
        let max_attempts = 180; // 30分钟
        let mut attempts = 0;

        loop {
            interval.tick().await;
            attempts += 1;

            if attempts > max_attempts {
                Self::mark_task_failed(
                    &db_pool,
                    &task_id,
                    "Task timeout after 30 minutes",
                ).await;

                window.emit("task-timeout", &task_id).ok();
                break;
            }

            match adapter.check_task_status(&provider_task_id).await {
                Ok(response) => {
                    match response.status.as_str() {
                        "SUCCESS" => {
                            Self::save_task_results(
                                &db_pool,
                                &task_id,
                                response.results.unwrap_or_default(),
                            ).await;

                            window.emit("task-completed", &task_id).ok();
                            break;
                        }
                        "ERROR" => {
                            Self::mark_task_failed(
                                &db_pool,
                                &task_id,
                                &response.message.unwrap_or_default(),
                            ).await;

                            window.emit("task-failed", &task_id).ok();
                            break;
                        }
                        "PROCESSING" => {
                            if let Some(progress) = response.progress {
                                window.emit("task-progress", serde_json::json!({
                                    "taskId": task_id,
                                    "progress": progress,
                                })).ok();
                            }
                        }
                        _ => {}
                    }
                }
                Err(e) => {
                    log::error!("Failed to check task status: {}", e);
                }
            }
        }
    }

    async fn save_task_results(
        pool: &DbPool,
        task_id: &str,
        results: Vec<GenerationResult>,
    ) {
        // 更新数据库任务状态为SUCCESS
        // 保存results到数据库
    }

    async fn mark_task_failed(
        pool: &DbPool,
        task_id: &str,
        error_message: &str,
    ) {
        // 更新数据库任务状态为FAILED
    }
}
```

### 3.3 IPC 命令

```rust
// src-tauri/src/commands/ai_gen.rs

use tauri::{State, Window};
use crate::state::AppState;
use crate::services::ai_adapter::AdapterFactory;
use crate::services::task_poller::TaskPoller;

#[tauri::command]
pub async fn generate(
    window: Window,
    state: State<'_, AppState>,
    model_id: String,
    prompt: String,
    input_images: Option<Vec<String>>,
    number_of_outputs: Option<i32>,
    parameters: Option<serde_json::Value>,
) -> Result<GenerationTaskResponse, String> {
    let pool = &state.db_pool;

    // 1. 获取模型配置
    let model = get_model_from_db(pool, &model_id).await
        .map_err(|e| e.to_string())?;

    // 2. 获取API密钥
    let api_key = get_api_key(&state, &model.provider_slug)
        .map_err(|e| e.to_string())?;

    // 3. 创建适配器
    let adapter = AdapterFactory::create(&model.adapter_name, api_key)
        .map_err(|e| e.to_string())?;

    // 4. 创建任务记录
    let task_id = create_task_in_db(
        pool,
        &model_id,
        &prompt,
        input_images.as_ref(),
        number_of_outputs,
        parameters.as_ref(),
    ).await.map_err(|e| e.to_string())?;

    // 5. 调用适配器
    let request = GenerationRequest {
        prompt,
        input_images,
        number_of_outputs,
        parameters,
    };

    let response = adapter.dispatch(request).await
        .map_err(|e| e.to_string())?;

    // 6. 处理响应
    match response.status.as_str() {
        "SUCCESS" => {
            // 同步成功，直接保存结果
            save_task_results(
                pool,
                &task_id,
                response.results.unwrap_or_default(),
            ).await.map_err(|e| e.to_string())?;

            Ok(GenerationTaskResponse {
                task_id,
                status: "SUCCESS".to_string(),
                results: response.results,
            })
        }
        "PROCESSING" => {
            // 异步任务，启动轮询
            if let Some(provider_task_id) = response.provider_task_id {
                let pool_clone = pool.clone();
                let window_clone = window.clone();
                let adapter_clone = adapter.clone();
                let task_id_clone = task_id.clone();

                tauri::async_runtime::spawn(async move {
                    TaskPoller::poll_async_task(
                        window_clone,
                        pool_clone,
                        task_id_clone,
                        provider_task_id,
                        adapter_clone,
                    ).await;
                });
            }

            Ok(GenerationTaskResponse {
                task_id,
                status: "PROCESSING".to_string(),
                results: None,
            })
        }
        _ => {
            Err(response.message.unwrap_or("Unknown error".to_string()))
        }
    }
}

#[tauri::command]
pub async fn get_task(
    state: State<'_, AppState>,
    task_id: String,
) -> Result<AIGenerationTask, String> {
    let pool = &state.db_pool;
    get_task_from_db(pool, &task_id).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_tasks(
    state: State<'_, AppState>,
    status: Option<String>,
    output_type: Option<String>,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<TaskList, String> {
    let pool = &state.db_pool;
    list_tasks_from_db(pool, status, output_type, limit, offset).await
        .map_err(|e| e.to_string())
}
```

### 3.4 前端集成

```typescript
// src/hooks/tauri/useAIGeneration.ts

import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import { useMutation, useQuery } from '@tanstack/react-query';

export function useGenerate() {
  return useMutation({
    mutationFn: async (params: {
      modelId: string;
      prompt: string;
      inputImages?: string[];
      numberOfOutputs?: number;
      parameters?: Record<string, unknown>;
    }) => {
      return invoke<GenerationTaskResponse>('generate', params);
    },
  });
}

export function useTaskProgress(taskId: string) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const unlisten = listen('task-progress', (event: any) => {
      if (event.payload.taskId === taskId) {
        setProgress(event.payload.progress);
      }
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, [taskId]);

  return progress;
}

export function useTaskCompletion(taskId: string, onComplete: () => void) {
  useEffect(() => {
    const unlisten = listen('task-completed', (event: any) => {
      if (event.payload === taskId) {
        onComplete();
      }
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, [taskId, onComplete]);
}
```

---

## Phase 4: 文件系统优化

**时间：2-3天**
**复杂度：低**

### 4.1 统一路径管理

```rust
// src-tauri/src/utils/paths.rs

use std::path::PathBuf;
use tauri::api::path::{app_data_dir, cache_dir, home_dir};

pub struct PathManager {
    pub app_data: PathBuf,
    pub media_uploads: PathBuf,
    pub thumbnails: PathBuf,
    pub temp: PathBuf,
    pub exports: PathBuf,
    pub downloads: PathBuf,
}

impl PathManager {
    pub fn new(config: &tauri::Config) -> Self {
        let app_data = app_data_dir(config)
            .unwrap()
            .join("yt-dlp-desktop");

        Self {
            media_uploads: app_data.join("media-uploads"),
            thumbnails: app_data.join("thumbnails"),
            temp: cache_dir().unwrap().join("yt-dlp-temp"),
            exports: app_data.join("exports"),
            downloads: home_dir()
                .unwrap()
                .join("Movies")
                .join("YT-DLP Downloads"),
            app_data,
        }
    }

    pub fn ensure_dirs(&self) -> std::io::Result<()> {
        std::fs::create_dir_all(&self.app_data)?;
        std::fs::create_dir_all(&self.media_uploads)?;
        std::fs::create_dir_all(&self.thumbnails)?;
        std::fs::create_dir_all(&self.temp)?;
        std::fs::create_dir_all(&self.exports)?;
        std::fs::create_dir_all(&self.downloads)?;
        Ok(())
    }

    pub fn get_media_file_path(&self, file_id: &str) -> PathBuf {
        self.media_uploads.join(file_id)
    }

    pub fn get_thumbnail_path(&self, file_id: &str) -> PathBuf {
        self.thumbnails.join(format!("{}.jpg", file_id))
    }
}
```

### 4.2 FFmpeg 封装

```rust
// src-tauri/src/utils/ffmpeg.rs

use std::process::Command;
use std::path::Path;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct VideoMetadata {
    pub duration: Option<f64>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub codec: Option<String>,
    pub bitrate: Option<i32>,
}

pub struct FFmpegWrapper;

impl FFmpegWrapper {
    pub async fn generate_thumbnail(
        video_path: &str,
        output_path: &str,
    ) -> Result<(), anyhow::Error> {
        let output = Command::new("ffmpeg")
            .args(&[
                "-i", video_path,
                "-ss", "00:00:01",
                "-vframes", "1",
                "-vf", "scale=400:400:force_original_aspect_ratio=decrease",
                "-q:v", "2",
                "-y",  // 覆盖输出文件
                output_path,
            ])
            .output()?;

        if output.status.success() {
            Ok(())
        } else {
            Err(anyhow::anyhow!(
                "FFmpeg error: {}",
                String::from_utf8_lossy(&output.stderr)
            ))
        }
    }

    pub async fn get_video_metadata(
        video_path: &str,
    ) -> Result<VideoMetadata, anyhow::Error> {
        let output = Command::new("ffprobe")
            .args(&[
                "-v", "quiet",
                "-print_format", "json",
                "-show_format",
                "-show_streams",
                video_path,
            ])
            .output()?;

        if !output.status.success() {
            return Err(anyhow::anyhow!("FFprobe failed"));
        }

        let json: serde_json::Value = serde_json::from_slice(&output.stdout)?;

        // 解析视频流信息
        let video_stream = json["streams"]
            .as_array()
            .and_then(|streams| {
                streams.iter().find(|s| {
                    s["codec_type"].as_str() == Some("video")
                })
            });

        Ok(VideoMetadata {
            duration: json["format"]["duration"]
                .as_str()
                .and_then(|s| s.parse().ok()),
            width: video_stream
                .and_then(|s| s["width"].as_i64())
                .map(|w| w as i32),
            height: video_stream
                .and_then(|s| s["height"].as_i64())
                .map(|h| h as i32),
            codec: video_stream
                .and_then(|s| s["codec_name"].as_str())
                .map(String::from),
            bitrate: json["format"]["bit_rate"]
                .as_str()
                .and_then(|s| s.parse().ok()),
        })
    }

    pub async fn compress_video(
        input_path: &str,
        output_path: &str,
        preset: &str,  // ultrafast, fast, medium, slow
    ) -> Result<(), anyhow::Error> {
        let output = Command::new("ffmpeg")
            .args(&[
                "-i", input_path,
                "-c:v", "libx264",
                "-preset", preset,
                "-crf", "23",
                "-c:a", "aac",
                "-b:a", "128k",
                "-y",
                output_path,
            ])
            .output()?;

        if output.status.success() {
            Ok(())
        } else {
            Err(anyhow::anyhow!("Video compression failed"))
        }
    }
}
```

### 4.3 API密钥加密存储

```rust
// src-tauri/src/utils/crypto.rs

use ring::aead::{Aad, BoundKey, Nonce, NonceSequence, UnboundKey, AES_256_GCM};
use ring::error::Unspecified;
use base64::{Engine as _, engine::general_purpose};

pub struct SecureStorage;

impl SecureStorage {
    pub fn encrypt_api_key(
        api_key: &str,
        master_key: &[u8; 32],
    ) -> Result<String, Unspecified> {
        let unbound_key = UnboundKey::new(&AES_256_GCM, master_key)?;
        let mut sealing_key = SealingKey::new(unbound_key);

        let nonce = Nonce::assume_unique_for_key([0u8; 12]);
        let mut in_out = api_key.as_bytes().to_vec();

        sealing_key.seal_in_place_append_tag(
            nonce,
            Aad::empty(),
            &mut in_out,
        )?;

        Ok(general_purpose::STANDARD.encode(&in_out))
    }

    pub fn decrypt_api_key(
        encrypted: &str,
        master_key: &[u8; 32],
    ) -> Result<String, Unspecified> {
        let encrypted_bytes = general_purpose::STANDARD
            .decode(encrypted)
            .map_err(|_| Unspecified)?;

        let unbound_key = UnboundKey::new(&AES_256_GCM, master_key)?;
        let mut opening_key = OpeningKey::new(unbound_key);

        let nonce = Nonce::assume_unique_for_key([0u8; 12]);
        let mut in_out = encrypted_bytes;

        let decrypted = opening_key.open_in_place(
            nonce,
            Aad::empty(),
            &mut in_out,
        )?;

        Ok(String::from_utf8_lossy(decrypted).to_string())
    }
}
```

---

## Phase 5: 性能优化（视频编辑准备）

**时间：3-5天**
**复杂度：高**

### 5.1 Metal GPU 加速（macOS）

```rust
// src-tauri/src/video/metal_processor.rs

#[cfg(target_os = "macos")]
use metal::{Device, MTLResourceOptions, Buffer, CommandQueue};
use std::sync::Arc;

#[cfg(target_os = "macos")]
pub struct MetalVideoProcessor {
    device: Device,
    command_queue: CommandQueue,
}

#[cfg(target_os = "macos")]
impl MetalVideoProcessor {
    pub fn new() -> Result<Self, anyhow::Error> {
        let device = Device::system_default()
            .ok_or_else(|| anyhow::anyhow!("No Metal device found"))?;

        let command_queue = device.new_command_queue();

        Ok(Self {
            device,
            command_queue,
        })
    }

    pub fn process_frame(&self, input: &[u8]) -> Result<Vec<u8>, anyhow::Error> {
        // GPU加速的视频帧处理
        // 为未来视频编辑功能预留

        let buffer = self.device.new_buffer_with_data(
            input.as_ptr() as *const _,
            input.len() as u64,
            MTLResourceOptions::CPUCacheModeDefaultCache,
        );

        // 创建command buffer
        let command_buffer = self.command_queue.new_command_buffer();

        // TODO: 添加Metal着色器处理

        command_buffer.commit();
        command_buffer.wait_until_completed();

        // 返回处理后的数据
        Ok(input.to_vec())
    }
}

#[cfg(not(target_os = "macos"))]
pub struct MetalVideoProcessor;

#[cfg(not(target_os = "macos"))]
impl MetalVideoProcessor {
    pub fn new() -> Result<Self, anyhow::Error> {
        Err(anyhow::anyhow!("Metal only available on macOS"))
    }

    pub fn process_frame(&self, _input: &[u8]) -> Result<Vec<u8>, anyhow::Error> {
        Err(anyhow::anyhow!("Metal only available on macOS"))
    }
}
```

### 5.2 异步文件 I/O

```rust
// src-tauri/src/utils/async_io.rs

use tokio::fs::File;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use std::path::Path;

pub async fn read_file_async(path: &Path) -> Result<Vec<u8>, std::io::Error> {
    let mut file = File::open(path).await?;
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer).await?;
    Ok(buffer)
}

pub async fn write_file_async(
    path: &Path,
    data: &[u8],
) -> Result<(), std::io::Error> {
    let mut file = File::create(path).await?;
    file.write_all(data).await?;
    file.sync_all().await?;
    Ok(())
}

pub async fn copy_file_async(
    from: &Path,
    to: &Path,
) -> Result<u64, std::io::Error> {
    tokio::fs::copy(from, to).await
}
```

### 5.3 并发任务管理

```rust
// src-tauri/src/services/task_scheduler.rs

use tokio::sync::Semaphore;
use std::sync::Arc;

pub struct TaskScheduler {
    semaphore: Arc<Semaphore>,
}

impl TaskScheduler {
    pub fn new(max_concurrent: usize) -> Self {
        Self {
            semaphore: Arc::new(Semaphore::new(max_concurrent)),
        }
    }

    pub async fn schedule<F, R>(&self, task: F) -> R
    where
        F: std::future::Future<Output = R>,
    {
        let _permit = self.semaphore.acquire().await.unwrap();
        task.await
    }
}
```

---

## Phase 6: 打包和分发

**时间：2-3天**
**复杂度：低**

### 6.1 Tauri 配置

```json
// src-tauri/tauri.conf.json
{
  "package": {
    "productName": "YT-DLP Desktop",
    "version": "1.0.0"
  },
  "build": {
    "beforeBuildCommand": "npm run build",
    "beforeDevCommand": "npm run dev",
    "devPath": "http://localhost:5173",
    "distDir": "../dist"
  },
  "tauri": {
    "bundle": {
      "active": true,
      "targets": ["dmg", "app"],
      "identifier": "com.ytdlp.desktop",
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/128x128@2x.png",
        "icons/icon.icns",
        "icons/icon.ico"
      ],
      "macOS": {
        "minimumSystemVersion": "10.15",
        "entitlements": "entitlements.plist",
        "frameworks": [],
        "signingIdentity": null
      },
      "resources": [
        "resources/ffmpeg",
        "resources/ffprobe",
        "resources/yt-dlp"
      ],
      "externalBin": [
        "resources/ffmpeg",
        "resources/ffprobe",
        "resources/yt-dlp"
      ]
    },
    "security": {
      "csp": "default-src 'self'; connect-src https://* http://localhost:*; img-src 'self' data: https://*; style-src 'self' 'unsafe-inline'"
    },
    "allowlist": {
      "all": false,
      "fs": {
        "all": true,
        "scope": [
          "$APPDATA/**",
          "$TEMP/**",
          "$HOME/Movies/**",
          "$HOME/Pictures/**"
        ]
      },
      "shell": {
        "open": true,
        "scope": [
          {
            "name": "ffmpeg",
            "cmd": "ffmpeg",
            "args": true,
            "sidecar": true
          },
          {
            "name": "ffprobe",
            "cmd": "ffprobe",
            "args": true,
            "sidecar": true
          },
          {
            "name": "yt-dlp",
            "cmd": "yt-dlp",
            "args": true,
            "sidecar": true
          }
        ]
      },
      "dialog": {
        "all": true,
        "open": true,
        "save": true
      },
      "notification": {
        "all": true
      },
      "path": {
        "all": true
      }
    },
    "windows": [
      {
        "title": "YT-DLP Desktop",
        "width": 1400,
        "height": 900,
        "resizable": true,
        "fullscreen": false,
        "minWidth": 1024,
        "minHeight": 768
      }
    ]
  }
}
```

### 6.2 权限配置（entitlements.plist）

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.disable-library-validation</key>
  <true/>
  <key>com.apple.security.device.audio-input</key>
  <true/>
  <key>com.apple.security.device.camera</key>
  <true/>
  <key>com.apple.security.files.user-selected.read-write</key>
  <true/>
  <key>com.apple.security.network.client</key>
  <true/>
</dict>
</plist>
```

### 6.3 打包脚本

```bash
#!/bin/bash
# scripts/build.sh

set -e

echo "📦 Building YT-DLP Desktop..."

# 1. 安装依赖
echo "Installing dependencies..."
npm install

# 2. 下载外部二进制
echo "Downloading external binaries..."
mkdir -p src-tauri/resources

# FFmpeg
if [ ! -f "src-tauri/resources/ffmpeg" ]; then
    curl -L https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip -o /tmp/ffmpeg.zip
    unzip -o /tmp/ffmpeg.zip -d src-tauri/resources/
    chmod +x src-tauri/resources/ffmpeg
fi

# FFprobe
if [ ! -f "src-tauri/resources/ffprobe" ]; then
    curl -L https://evermeet.cx/ffmpeg/getrelease/ffprobe/zip -o /tmp/ffprobe.zip
    unzip -o /tmp/ffprobe.zip -d src-tauri/resources/
    chmod +x src-tauri/resources/ffprobe
fi

# yt-dlp
if [ ! -f "src-tauri/resources/yt-dlp" ]; then
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos -o src-tauri/resources/yt-dlp
    chmod +x src-tauri/resources/yt-dlp
fi

# 3. 构建前端
echo "Building frontend..."
npm run build

# 4. 构建 Tauri 应用
echo "Building Tauri app..."
cd src-tauri
cargo build --release
cd ..

# 5. 创建 DMG
echo "Creating DMG..."
npm run tauri build

echo "✅ Build complete!"
echo "DMG location: src-tauri/target/release/bundle/dmg/"
```

### 6.4 自动更新配置

```json
// tauri.conf.json 添加
{
  "tauri": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://releases.myapp.com/{{target}}/{{current_version}}"
      ],
      "dialog": true,
      "pubkey": "YOUR_PUBLIC_KEY_HERE"
    }
  }
}
```

---

## 📊 完整迁移时间表

| 阶段 | 任务 | 工作量 | 复杂度 | 依赖 |
|------|------|--------|--------|------|
| **Phase 1** | 项目架构搭建 | 3-5天 | 中 | - |
| | - Tauri 项目初始化 | 1天 | 低 | - |
| | - 数据库迁移（Diesel） | 2-3天 | 中 | - |
| | - 全局状态管理 | 1天 | 低 | - |
| **Phase 2** | 媒体浏览器迁移 | 5-7天 | 中 | Phase 1 |
| | - IPC 命令实现 | 2天 | 中 | - |
| | - 媒体管理服务 | 2天 | 中 | - |
| | - 缩略图生成 | 1天 | 低 | - |
| | - 前端适配 | 2-3天 | 中 | - |
| **Phase 3** | AI生成模块迁移 | 7-10天 | 高 | Phase 1 |
| | - AI适配器重写 | 4-5天 | 高 | - |
| | - 任务轮询服务 | 2天 | 中 | - |
| | - IPC 命令 | 1天 | 低 | - |
| | - 前端集成 | 2天 | 中 | - |
| **Phase 4** | 文件系统优化 | 2-3天 | 低 | Phase 1-3 |
| | - 路径管理 | 1天 | 低 | - |
| | - FFmpeg 封装 | 1天 | 低 | - |
| | - 密钥加密 | 1天 | 低 | - |
| **Phase 5** | 性能优化 | 3-5天 | 高 | Phase 1-4 |
| | - Metal GPU 加速 | 2-3天 | 高 | - |
| | - 异步 I/O | 1天 | 低 | - |
| | - 任务调度 | 1天 | 中 | - |
| **Phase 6** | 打包和分发 | 2-3天 | 低 | Phase 1-5 |
| | - Tauri 配置 | 1天 | 低 | - |
| | - 外部依赖打包 | 1天 | 低 | - |
| | - 测试和优化 | 1天 | 低 | - |
| **总计** | | **22-33天** | | |

---

## ⚠️ 风险评估

### 高风险项

#### 1. 适配器迁移（45+ 个）

**风险：**
- 工作量巨大
- API 调用细节可能丢失
- 测试覆盖率不足

**缓解措施：**
- 优先迁移核心适配器（5-10个）
- 建立自动化测试
- 逐步迁移其余适配器

#### 2. 数据库迁移

**风险：**
- Prisma → Diesel 数据模型差异
- 关系映射复杂
- 迁移脚本可能失败

**缓解措施：**
- 先在测试环境验证
- 保留原始数据备份
- 编写数据迁移工具

#### 3. FFmpeg/yt-dlp 打包

**风险：**
- 二进制文件体积大
- 权限和签名问题
- 不同 macOS 版本兼容性

**缓解措施：**
- 使用静态链接版本
- 测试多个 macOS 版本
- 提供系统安装选项

### 中风险项

#### 4. 前端代码改造

**风险：**
- tRPC → Tauri IPC 改造遗漏
- React hooks 依赖变化
- 类型定义不一致

**缓解措施：**
- 渐进式改造
- 保持 TypeScript 类型一致
- 充分的单元测试

#### 5. 性能优化

**风险：**
- Metal API 学习曲线
- GPU 加速效果不明显
- 内存管理问题

**缓解措施：**
- 先实现基础功能
- 性能优化作为独立阶段
- 基准测试验证

### 低风险项

#### 6. 路径管理

**风险：**
- 硬编码路径遗漏
- 跨平台兼容性（虽然只支持 macOS）

**缓解措施：**
- 统一 PathManager 工具类
- 代码审查

#### 7. API 密钥加密

**风险：**
- 加密实现错误
- 密钥丢失

**缓解措施：**
- 使用成熟的加密库（ring）
- 提供密钥导入/导出功能

---

## 🎯 核心优势总结

### 性能优势

1. **启动速度**
   - Tauri: 0.5秒
   - Electron: 2-3秒
   - **提升 4-6倍**

2. **内存占用**
   - Tauri: ~50MB
   - Electron: ~200MB
   - **减少 75%**

3. **包体积**
   - Tauri DMG: ~15MB
   - Electron DMG: ~150MB
   - **减少 90%**

### 技术优势

1. **原生 macOS 集成**
   - AVFoundation 视频处理
   - Metal GPU 加速
   - 系统通知
   - Finder 集成

2. **安全性**
   - Rust 内存安全
   - 细粒度权限控制
   - API 密钥加密存储

3. **可扩展性**
   - 模块化架构
   - 插件系统
   - 视频编辑基础

### 用户体验

1. **响应速度**
   - 原生渲染
   - 异步 I/O
   - GPU 加速

2. **稳定性**
   - Rust 类型安全
   - 错误处理完善
   - 内存管理自动化

3. **原生感受**
   - macOS 设计语言
   - 系统级集成
   - 流畅动画

---

## 📚 学习资源

### Rust 学习

- [Rust 官方教程](https://doc.rust-lang.org/book/)
- [Rust by Example](https://doc.rust-lang.org/rust-by-example/)
- 预计学习时间：2-3天基础

### Tauri 学习

- [Tauri 官方文档](https://tauri.app/v2/guides/)
- [Tauri IPC 指南](https://tauri.app/v2/guides/features/ipc/)
- 预计学习时间：1-2天

### Diesel ORM

- [Diesel 官方文档](https://diesel.rs/guides/getting-started)
- [Diesel 迁移指南](https://diesel.rs/guides/schema-in-depth/)
- 预计学习时间：1天

---

## 🚀 下一步行动

### 立即开始

1. **环境准备**
   ```bash
   # 安装 Rust
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

   # 安装 Tauri CLI
   cargo install tauri-cli

   # 创建项目
   npm create tauri-app
   ```

2. **数据库迁移工具**
   - 编写 Prisma → Diesel 转换脚本
   - 验证数据完整性

3. **核心功能 MVP**
   - 先实现媒体浏览器基础功能
   - 验证技术可行性
   - 获取早期反馈

### 里程碑

- **Week 1-2**: Phase 1 + Phase 2 部分
- **Week 3-4**: Phase 2 完成 + Phase 3 开始
- **Week 5**: Phase 3 完成 + Phase 4
- **Week 6**: Phase 5 + Phase 6
- **Week 7**: 测试和优化

---

## 📞 支持和反馈

如有任何问题或需要进一步的技术支持，请随时联系！

**文档版本**: 1.0
**最后更新**: 2025-01-22
**作者**: Claude Code Assistant
