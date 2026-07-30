# 开发指南

## 环境要求

- Node.js 24+
- pnpm 10+
- Docker Compose

## 首次启动

```bash
pnpm install
cp server/.env.example server/.env
# 修改 JWT_SECRET、数据库/Redis密码和 SEED_ADMIN_PASSWORD
pnpm infra:up
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

默认地址：

- Web：`http://localhost:5173`
- Server：`http://localhost:3000`
- Swagger：显式设置 `SWAGGER_ENABLED=true` 后访问 `http://localhost:3000/api-docs`

## 常用命令

```bash
pnpm lint
pnpm test
pnpm build
pnpm db:migrate
pnpm db:seed
pnpm infra:down
```

开发环境使用 `prisma migrate dev` 创建迁移；生产环境只能使用已经评审过的迁移执行 `prisma migrate deploy`。

## 新增业务模块检查

1. Prisma 模型包含必要的 `ownerId`、`departmentId`、时间和索引。
2. DTO 使用白名单验证，不直接接受 Prisma Model。
3. 控制器同时使用 `JwtAuthGuard`、`PermissionsGuard` 和显式 `@Permissions()`。
4. 创建、修改、删除等关键动作添加 `@Audit()`。
5. 列表、详情、修改、删除都应用 `DataScopeService`，不能只过滤列表。
6. 非超级管理员的转授权必须限制在自己拥有的范围内。
7. 响应中不返回密码哈希、Token、密钥和内部异常。
8. 增加越权、状态撤销、输入验证等回归测试。
9. 增加菜单和 Seed 时保持幂等。
10. 执行 `pnpm lint && pnpm test && pnpm build`。

## 数据库迁移原则

- 已提交或已部署的迁移文件不得修改。
- 重命名、删除字段采用“扩展—迁移数据—收缩”多版本流程。
- 大表建索引和回填先评估锁表时间。
- Seed 只创建基础数据，不用于持续修改生产业务数据。
