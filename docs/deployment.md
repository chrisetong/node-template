# 生产部署

本文以单机 Docker Compose 为基础。多节点部署应把 MySQL、Redis、上传文件和日志迁移到托管或共享基础设施。

如果采用与 gwgl 类似的“构建机打镜像、上传服务器、服务器加载镜像”发布方式，请直接阅读
[Docker 镜像部署手册](image-deployment.md)。

## 首次部署

### 1. 准备配置

```bash
cp server/.env.production.example server/.env.production
chmod 600 server/.env.production
```

必须替换全部 `CHANGE_` 值。建议用密码管理器保存密钥，JWT 可通过安全随机源生成，例如：

```bash
openssl rand -base64 48
```

关键配置：

- `DEPLOYMENT_ID`、`COMPOSE_PROJECT_NAME` 在同一 Docker 主机上必须唯一。
- `MYSQL_DATABASE` 必须与 `DATABASE_URL` 中的数据库名一致。
- `CACHE_NAMESPACE` 是所有 Redis Key 的全局前缀，每套独立系统必须唯一。
- `MYSQL_HOST_PORT`、`REDIS_HOST_PORT`、`ADMIN_PORT`
  在同一宿主机上不能冲突。
- `DATABASE_URL` 中主机名在 Compose 内应为 `db`。
- `CORS_ORIGIN` 是浏览器实际访问的 HTTPS 域名。
- 同域部署时 `API_BASE_URL=https://域名/api`，`ASSET_BASE_URL=https://域名`。
- 后台构建使用 `VITE_APP_BASE=/admin/`，正式访问地址为 `https://域名/admin/`。
- 外部 HTTPS 代理和业务镜像内 Nginx 共两层时，`TRUST_PROXY_HOPS=2`。
- 为 `APP_IMAGE` 使用不可变版本标签，不使用 `latest`。

同一台主机部署两套系统时，不要复制同一份生产环境文件直接启动，完整配置见
[同机多实例部署](multi-instance-deployment.md)。

### 2. 发布前检查

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm test
pnpm build
pnpm prod:config
pnpm prod:build
```

### 3. 启动依赖并迁移

```bash
docker compose --env-file server/.env.production -f server/docker-compose.yml up -d db redis
pnpm prod:migrate
```

首次部署再执行一次：

```bash
pnpm prod:seed
```

Seed 不会重置已存在管理员的密码。部署完成后应从 `.env.production` 中删除 `SEED_ADMIN_PASSWORD`，需要再次 Seed 时临时注入。

### 4. 启动应用

```bash
pnpm prod:up
docker compose --env-file server/.env.production -f server/docker-compose.yml ps
```

本机验证：

```bash
curl --fail http://127.0.0.1:8080/healthz
curl --fail http://127.0.0.1:8080/api/health
curl --fail http://127.0.0.1:8080/admin/
curl --head http://127.0.0.1:8080/admin
curl --head http://127.0.0.1:8080/admin/index.html
```

最后两个请求应返回 `301` 并跳转到 `/admin/`。`/h5/` 当前应返回 `404`，不能落入后台 SPA。

### 5. 配置 HTTPS 入口

Web 默认只监听 `127.0.0.1:8080`。在宿主机反向代理或云负载均衡上配置证书，再代理到该地址。Nginx 示例：

```nginx
server {
  listen 443 ssl http2;
  server_name admin.example.com;

  ssl_certificate     /安全路径/fullchain.pem;
  ssl_certificate_key /安全路径/privkey.pem;

  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
  }
}
```

同时将 HTTP 重定向到 HTTPS，并通过防火墙禁止公网访问 3000、3306、6379 和 8080。

正式后台入口是 `https://admin.example.com/admin/`。不要发布或传播
`https://admin.example.com/admin/index.html`；内部 Nginx 会将它永久重定向到
`/admin/`。API、上传文件和健康检查仍分别使用顶级 `/api/`、`/uploads/` 和
`/healthz`。

## 版本升级

1. 阅读迁移文件，确认是否包含删列、改类型或长时间锁表。
2. 完成数据库和上传文件备份。
3. 使用新版本标签构建或拉取单个业务镜像。
4. 执行 `pnpm prod:migrate`。
5. 执行 `pnpm prod:up` 滚动到新镜像。
6. 检查健康接口、登录、权限、上传和审计日志。
7. 观察错误日志和数据库负载。

数据库变更必须保持旧应用短期兼容，才能安全先迁移再发布。

## 回滚

- 应用代码：把 `APP_IMAGE` 改回上一不可变版本，执行 `pnpm prod:up`。
- 数据库：Prisma 不自动生成安全的向下迁移，不要直接删除生产字段。优先发布修复版本；只有经过演练并确认数据影响后才执行人工恢复。
- 恢复前保留故障现场日志、审计记录和当前数据库备份。

## 发布后检查

- HTTPS、证书链和 HTTP 重定向正常。
- `/admin`、`/admin/index.html` 均 301 到 `/admin/`，后台子路由刷新可回退到 SPA。
- `/h5/` 返回 404，未被后台 fallback 吞掉。
- `/healthz`、`/api/health` 返回成功。
- 管理员登录、验证码、退出登录正常。
- 普通角色不能访问未授权菜单、接口和其他部门数据。
- 上传文件重启容器后仍可访问。
- 审计日志产生记录且不包含密码、Token。
- MySQL、Redis、上传和日志卷存在并有足够空间。
