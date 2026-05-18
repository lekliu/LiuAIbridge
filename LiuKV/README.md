# LiuKV

一个轻量级的内存键值存储服务，专为高性能、低延迟的统计数据存储设计。

## ✨ 功能特性

- ⚡ **高性能**: 基于 Go + Gin 构建，单实例支持 10,000+ QPS
- 📦 **纯内存存储**: 数据仅存储在内存中，读写延迟 < 5ms
- 🔒 **安全认证**: 可配置 Token 认证机制
- 🎨 **Web 管理界面**: 提供直观的可视化管理界面
- 📁 **多应用隔离**: 支持多个 Namespace，数据互不干扰
- ⏰ **TTL 过期**: 支持键的自动过期删除
- 🗑️ **LRU 淘汰**: 内存满时自动淘汰最久未使用的键
- 🐳 **Docker 部署**: 一键容器化部署

## 🚀 快速开始

### 方式一：Docker Compose（推荐）

```bash
# 进入项目目录
cd LiuKV

# 复制并修改环境变量配置
cp .env.example .env

# 启动服务
docker compose up -d
```

### 方式二：本地运行

```bash
# 安装依赖
go mod download

# 编译
go build -o liukv main.go

# 设置环境变量并运行
export AUTH_TOKEN=your-secret-token
export MAX_MEMORY_MB=128
./liukv
```

### 方式三：直接运行

```bash
go run main.go
```

## 📡 API 接口

### 基础认证

所有请求需要在请求头中携带 Token：
```bash
X-KV-Token: your-secret-token
```

或者使用 URL 参数：
```bash
?token=your-secret-token
```

### 完整 API 列表

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/health` | 健康检查（无需认证） |
| GET | `/kv/_admin/namespaces` | 获取所有 Namespace |
| POST | `/kv/_admin/namespaces/:name` | 创建 Namespace |
| DELETE | `/kv/_admin/namespaces/:name` | 删除 Namespace |
| GET | `/kv/_admin/stats` | 获取全局统计 |
| GET | `/kv/:ns/_stats` | 获取指定 Namespace 统计 |
| GET | `/kv/:ns/_keys` | 列出所有键 |
| DELETE | `/kv/:ns/_clear` | 清空 Namespace |
| POST | `/kv/:ns/_batch/get` | 批量获取 |
| POST | `/kv/:ns/_batch/put` | 批量写入 |
| GET | `/kv/:ns/:key` | 获取值 |
| PUT | `/kv/:ns/:key` | 写入值 |
| DELETE | `/kv/:ns/:key` | 删除键 |

### API 使用示例

```bash
# 健康检查
curl http://localhost:8787/health

# 创建 Namespace
curl -X POST -H "X-KV-Token: mytoken" http://localhost:8787/kv/_admin/namespaces/myapp

# 写入数据（带 TTL）
curl -X PUT -H "X-KV-Token: mytoken" \
  "http://localhost:8787/kv/myapp/user_123?ttl=3600" \
  -d '{"name":"张三"}'

# 读取数据
curl -H "X-KV-Token: mytoken" http://localhost:8787/kv/myapp/user_123

# 列出键（支持前缀搜索）
curl -H "X-KV-Token: mytoken" "http://localhost:8787/kv/myapp/_keys?prefix=user_"

# 删除键
curl -X DELETE -H "X-KV-Token: mytoken" http://localhost:8787/kv/myapp/user_123

# 批量操作
curl -X POST -H "X-KV-Token: mytoken" \
  -H "Content-Type: application/json" \
  http://localhost:8787/kv/myapp/_batch/put \
  -d '{"key1":"value1","key2":"value2"}'
```

## 🎨 Web 管理界面

访问 `http://localhost:8787/` 打开管理界面：

### 功能特点

- **Namespace 管理**: 创建、删除、切换 Namespace
- **数据浏览**: 查看、搜索、编辑键值对
- **TTL 设置**: 支持设置键的过期时间
- **统计信息**: 实时显示内存使用和键数量
- **批量操作**: 支持批量写入和删除

### 界面预览

```
┌─────────────────────────────────────────────────────────────┐
│  📦 LiuKV                        Namespaces (3)           │
├─────────────────────────────────────────────────────────────┤
│  [myapp]  [stats]  [cache]  [+ 创建]                       │
├─────────────────────────────────────────────────────────────┤
│  📊 myapp - 统计信息                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│  │ Keys: 10 │ │ 0.01 MB  │ │ 128 MB   │                   │
│  └──────────┘ └──────────┘ └──────────┘                   │
├─────────────────────────────────────────────────────────────┤
│  ✏️ 写入数据                                                │
│  Key: [___________]  TTL: [______]                         │
│  Value: [_____________________________________________]    │
│  [写入]                                                    │
├─────────────────────────────────────────────────────────────┤
│  🔍 浏览数据                                                │
│  搜索: [_______________]                                   │
│  ┌─────────────────────────────────────────────────┐       │
│  │ user_001           [查看] [删除]               │       │
│  │ user_002           [查看] [删除]               │       │
│  └─────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

## ⚙️ 配置选项

### 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | 8787 | 服务端口 |
| `AUTH_TOKEN` | 空（无需认证） | 访问 Token |
| `MAX_MEMORY_MB` | 128 | 最大内存限制（MB） |
| `ENABLE_CORS` | true | 启用 CORS |
| `CORS_ORIGIN` | * | 允许的跨域来源 |

### Docker Compose 配置示例

```yaml
services:
  liukv:
    build: .
    container_name: liukv
    ports:
      - "8787:8787"
    environment:
      - PORT=8787
      - AUTH_TOKEN=your-secret-token
      - MAX_MEMORY_MB=256
      - ENABLE_CORS=true
      - CORS_ORIGIN=*
    restart: unless-stopped
```

## 📁 项目结构

```
LiuKV/
├── main.go                    # 入口文件
├── go.mod / go.sum            # Go 依赖
├── Dockerfile                 # Docker 构建
├── docker-compose.yml         # Docker Compose
├── .env.example              # 环境变量示例
├── README.md                 # 文档
├── internal/
│   ├── config/config.go      # 配置加载
│   ├── kv/store.go           # 内存存储引擎
│   ├── kv/namespace.go       # Namespace 管理
│   ├── handler/kv.go         # API 处理器
│   ├── handler/health.go     # 健康检查
│   └── middleware/auth.go    # 认证中间件
└── public/index.html         # Web 管理界面
```

## 🔧 技术栈

- **语言**: Go 1.26+
- **框架**: Gin
- **前端**: Vue 3 (CDN)
- **容器**: Docker

## ⚠️ 注意事项

1. **数据持久化**: 数据仅存储在内存中，服务重启后数据会丢失
2. **内存限制**: 当内存使用达到 `MAX_MEMORY_MB` 时，会自动淘汰最久未使用的键
3. **TTL 过期**: 键的过期是惰性检查，过期键在访问时或定期清理时删除
4. **认证安全**: 建议在生产环境中设置强 `AUTH_TOKEN`

## 📝 License

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**LiuKV** - 轻量级内存键值存储服务