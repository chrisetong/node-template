# Server

NestJS 11 + Prisma API，核心模块包括：

- `auth`：JWT、Redis 单会话、验证码和登录锁定；
- `user`、`role`、`menu`：多角色 RBAC 与安全转授权；
- `department`、`data-scope`：部门树和服务端数据范围；
- `audit`：不记录请求正文的结构化操作审计；
- `file`：鉴权、大小、MIME 和文件魔数校验后的本地上传。
- `system-setting`：强类型单例视觉设置、公开只读接口、RBAC 管理接口和专用图片上传。

数据权限接入方式，以及启动、迁移、Seed、代理边界说明见根目录 `README.md`。

生产部署从 `.env.production` 读取配置。复制 `.env.production.example` 后，必须替换其中所有 `CHANGE_` 值；生产启动会校验数据库 URL、JWT 长度、CORS、bcrypt cost、密码长度和限流范围。Swagger 默认关闭。

生产使用 `pnpm prod:migrate` 执行已经提交的 Prisma Migration，不能使用 `migrate dev`、`db push --force-reset` 或 `migrate reset`。部署与运维手册位于根目录 `docs/`。
