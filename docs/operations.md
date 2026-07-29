# 日常运维

以下命令均在项目根目录执行，并使用 `server/.env.production`。

多实例部署时，先确认目标环境文件中的 `COMPOSE_PROJECT_NAME`、`MYSQL_DATABASE`
和 `CACHE_NAMESPACE`，并使用显式 `docker compose --env-file <目标文件>` 命令。
不要用默认 `pnpm prod:*` 命令操作非默认实例。参见
[同机多实例部署](multi-instance-deployment.md)。

## 状态与日志

```bash
docker compose --env-file server/.env.production -f server/docker-compose.yml ps
pnpm prod:logs
docker compose --env-file server/.env.production -f server/docker-compose.yml logs --tail=200 db redis
```

健康检查：

```bash
curl --fail http://127.0.0.1:8080/healthz
curl --fail http://127.0.0.1:8080/api/health
```

`/healthz` 表示业务镜像内 Nginx 存活，`/api/health` 表示它到 NestJS 的代理链路可用。目前它们不是 MySQL、Redis 的完整就绪探针；还需结合容器健康状态和真实登录检查。

## 启停

```bash
pnpm prod:up
pnpm prod:down
```

`prod:down` 不删除命名卷。禁止在未确认备份和目标范围时执行 `docker compose down -v`。

## 日常观察指标

- HTTP 5xx、401、403、429 数量和延迟。
- Server 重启次数、事件循环和内存。
- MySQL 连接、慢查询、磁盘、锁等待和备份状态。
- Redis 内存、拒绝连接、AOF 状态。
- 上传卷、日志卷和宿主机磁盘使用率。
- 登录失败、管理员操作和权限变更审计。

建议至少设置：

- 连续健康检查失败告警；
- 5xx 比例和登录失败突增告警；
- 磁盘使用率 80% 预警、90% 严重告警；
- 数据库备份失败和恢复演练逾期告警；
- 管理员角色、菜单和数据范围变更通知。

## 常见管理操作

- 强制用户下线：禁用用户、修改其角色/状态，或修改密码；这些操作会递增 Token 版本并删除当前 Redis 会话。
- 解除登录锁定：等待锁定时间结束。确需提前处理时，应确认来源 IP 和账号安全后删除对应 Redis 限流键，不要清空整个 Redis。
- 调整审计保留：修改 `AUDIT_RETENTION_DAYS` 后重启 Server；允许范围 30–3650 天。
- 查看应用文件日志：进入 `app_logs` 卷对应目录，或通过 `docker compose exec app ls -lah logs` 检查。

## 定期任务

- 每日：检查告警、备份结果、磁盘和异常登录。
- 每周：检查依赖漏洞、管理员和超级角色变更。
- 每月：验证恢复样本、审查长期未使用账号和权限。
- 每季度：执行完整灾难恢复演练和密钥轮换评估。
