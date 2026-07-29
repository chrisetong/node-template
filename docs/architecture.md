# 架构说明

## 组件

```text
浏览器
  │ HTTPS
  ▼
外部负载均衡 / HTTPS 反向代理
  │ HTTP（仅本机或私有网络）
  ▼
业务镜像内 Nginx :8080
  ├── /admin/*         Vue 3 后台静态文件与 SPA fallback
  ├── /h5/*            未来移动端预留（当前返回 404）
  ├── /api/*          反向代理到 Server，并去掉 /api 前缀
  └── /uploads/*      反向代理到 Server 上传目录
                        │
                        ▼
                    NestJS :3000
                      ├── Prisma ── MySQL :3306
                      └── Cache ─── Redis :6379
```

生产 Compose 默认把业务镜像、MySQL 和 Redis 端口绑定到 `127.0.0.1`，外部只应访问 HTTPS 入口。若运行在集群中，应使用私有网络、安全组和托管数据库替代主机端口映射。

## 目录

- `server/src/auth`：验证码、登录锁定、JWT 和 Redis 单会话。
- `server/src/user`、`role`、`menu`：用户、多角色、菜单与按钮权限。
- `server/src/department`、`data-scope`：部门树和行级数据范围。
- `server/src/audit`：关键操作审计，不记录请求正文。
- `server/src/system-setting`：公开视觉设置、受 RBAC 保护的单例配置和专用图片上传。
- `server/prisma`：Schema、Migration 和幂等 Seed。
- `admin/src/views`：Vue 管理页面，菜单中的 `component` 与这里的路径对应。
- `server/nginx.production.conf`：业务镜像内的后台静态资源、安全响应头和 API 代理规则。

后台构建基路径由 `VITE_APP_BASE` 控制，生产默认 `/admin/`。Vue Router 继续使用 Vite 的 `BASE_URL`，所以正式入口必须是 `https://域名/admin/`，不是 `index.html`。

## 持久化数据

| 数据 | 默认位置 | 是否必须备份 |
| --- | --- | --- |
| 业务数据、权限、审计日志 | MySQL `db_data` | 必须 |
| 上传文件 | Server `app_uploads` | 必须 |
| Redis 会话、验证码、限流状态 | Redis `redis_data` | 可选；丢失会导致用户重新登录 |
| 应用文件日志 | Server `app_logs` | 按合规和排障要求 |

数据库是权限和会话版本的最终事实来源。Redis 只保存短期状态，不能作为业务数据存储。

## 授权模型

请求依次经过 JWT 校验、Redis 当前会话校验、数据库用户/角色状态校验和权限守卫。数据查询还必须应用 `DataScopeService`：

- `ALL`：全部数据；
- `CUSTOM`：指定部门；
- `DEPARTMENT`：本部门；
- `DEPARTMENT_AND_CHILDREN`：本部门及所有下级；
- `SELF`：仅本人。

多角色取范围并集。无有效范围时失败关闭为仅本人。列表、详情、修改和删除必须使用同一数据范围条件。

## 信任边界

- 浏览器不可信，前端权限只用于界面展示。
- `X-Forwarded-For` 只有在 `TRUST_PROXY_HOPS` 与真实代理层数完全一致时才可信。
- 生产密钥只进入运行环境，不进入镜像、日志或版本库。
- 上传文件即使通过 MIME 和文件魔数校验，也不应由应用服务器执行。
- `/health` 目前是进程存活检查，不代表所有外部依赖都健康。
