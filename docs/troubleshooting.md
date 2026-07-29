# 故障排查

## Server 启动失败

先查看：

```bash
docker compose --env-file server/.env.production -f server/docker-compose.yml logs --tail=200 app
```

常见原因：

- 环境变量包含 `CHANGE_` 占位值；
- JWT 少于 32 字符；
- `CORS_ORIGIN` 为空；
- `DATABASE_URL` 使用了 `127.0.0.1`，但 Compose 内应使用服务名 `db`；
- MySQL 或 Redis 密码不一致；
- 数据库迁移尚未执行。

## 页面显示 502

```bash
docker compose --env-file server/.env.production -f server/docker-compose.yml ps
curl --fail http://127.0.0.1:8080/api/health
```

如果健康接口失败，检查 `app` 日志中的 NestJS 与内部 Nginx 输出；内部代理配置位于 `server/nginx.production.conf`。

后台页面固定使用 `/admin/`。若静态资源 404，检查镜像是否使用
`VITE_APP_BASE=/admin/` 构建，并确认访问地址不是根路径或
`/admin/index.html`。`/h5/` 当前预期返回 404。

## 登录失败或 429

- 验证码只能使用一次，刷新登录页后重新获取。
- 同一用户名和可信客户端 IP 连续失败默认锁定 15 分钟。
- 检查反向代理层数与 `TRUST_PROXY_HOPS`，错误配置可能把所有用户识别成同一 IP。
- 不要通过修改错误提示来区分账号不存在、禁用或密码错误。

## 登录后立即 401

- Redis 中只保留一个当前会话，后一次登录会使前一次登录失效。
- 修改密码、用户状态、角色、角色状态、菜单权限或数据范围会撤销旧会话。
- 检查多实例是否连接到同一 Redis 和同一 `CACHE_NAMESPACE`。
- 检查 JWT 密钥是否在实例间一致。

## 页面或接口 403

- 控制器必须显式声明权限；缺少元数据默认拒绝。
- 检查角色是否启用、是否绑定菜单和权限标识。
- 数据权限与功能权限相互独立：拥有按钮权限也不能操作范围外数据。
- 角色变更后需要重新登录。

## CORS 错误

- `CORS_ORIGIN` 必须包含浏览器地址的完整 Origin，不包含路径。
- 同域生产部署推荐前端使用 `/api`，避免不必要的跨域。
- 修改配置后必须重启 Server。

## 上传失败或重启后文件消失

- 单文件上限为 5 MiB，代理 `client_max_body_size` 为 6 MiB。
- 只允许配置的图片和 PDF 类型，并校验文件魔数。
- 系统设置 Logo/背景图只能走 `/api/system-setting/upload/:kind`，要求
  `systemSetting:update`，不会因为拥有通用 `file:upload` 而放行。
- 确认 `app_uploads` 卷已挂载到 `/app/server/public/uploads`。
- 检查卷空间、目录权限和 `/uploads/` 代理规则。

## 数据库时间不正确

- `APP_TIME_ZONE` 默认 `Asia/Shanghai`。
- MySQL 容器和连接会话的 `DB_TIME_ZONE` 默认 `+08:00`。
- 修改后重启 Server，新连接才会应用会话时区。

## 迁移失败

```bash
docker compose --env-file server/.env.production -f server/docker-compose.yml \
  --profile tools run --rm migrate
```

保留完整错误信息并检查 `prisma/migrations`。不要修改已经部署的迁移文件，也不要在生产使用 `prisma migrate reset` 或 `db push --force-reset`。

## 磁盘持续增长

- 审计日志由 `AUDIT_RETENTION_DAYS` 控制，默认 180 天。
- Winston 文件日志默认轮转保留 14 天。
- 上传文件不会自动删除，需要由业务定义清理策略。
- 检查 MySQL binlog、Docker 镜像和容器日志占用。
