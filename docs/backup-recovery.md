# 备份与恢复

## 备份范围

必须备份：

- MySQL 数据库；
- `app_uploads` 上传文件卷；
- 生产配置的加密副本或 Secret Store 配置；
- 镜像版本、代码版本和迁移记录。

Redis 保存的是可重建短期状态，恢复失败的主要影响是用户重新登录，一般不作为业务恢复依赖。

## MySQL 备份

先创建权限受限目录：

```bash
mkdir -p backups
chmod 700 backups
```

一致性逻辑备份示例：

```bash
docker compose --env-file server/.env.production -f server/docker-compose.yml \
  exec -T db sh -c \
  'MYSQL_PWD="$MYSQL_PASSWORD" exec mysqldump -u"$MYSQL_USER" --single-transaction --routines --triggers "$MYSQL_DATABASE"' \
  > "backups/mysql-$(date +%Y%m%d-%H%M%S).sql"
```

备份完成后检查文件非空、计算校验和，并复制到与生产主机隔离的加密存储。

## 上传文件备份

```bash
docker compose --env-file server/.env.production -f server/docker-compose.yml \
  exec -T app tar -C public -czf - uploads \
  > "backups/uploads-$(date +%Y%m%d-%H%M%S).tar.gz"
```

数据库与上传文件应尽量在同一维护窗口生成，减少引用不一致。

## 恢复原则

恢复属于高风险操作：

1. 优先恢复到隔离的新数据库和新卷。
2. 校验备份日期、版本、哈希和迁移状态。
3. 停止应用写入并先备份当前故障现场。
4. 恢复后执行 `prisma migrate status`，不要直接运行开发迁移。
5. 验证用户、权限、部门范围、上传文件和审计记录。
6. 业务负责人确认后再切换流量。

不要在未确认目标数据库、备份文件和维护窗口时执行覆盖恢复。

## 恢复演练

至少每季度执行一次：

- 在隔离环境创建空 MySQL；
- 导入最近备份；
- 恢复上传文件；
- 启动对应版本镜像；
- 验证登录、权限、抽样业务数据和文件；
- 记录恢复用时和缺失项。

只有实际成功恢复过的备份才算有效备份。
