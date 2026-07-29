# Docker 单镜像部署手册

本文采用与 gwgl 相同的交付思路：构建机生成一个完整业务镜像，生产服务器只加载镜像、配置环境变量、迁移数据库和启动容器，不在服务器编译代码。

`node-template-app` 镜像内包含：

- Vue 前端静态文件；
- NestJS API 服务；
- 内部 Nginx，提供前端，并将 `/api/`、`/uploads/` 转发到 NestJS；
- Supervisor，负责同时守护 Nginx 和 NestJS。

Compose 仍独立管理 MySQL、Redis 和业务数据卷。浏览器与宿主机反向代理只需访问一个业务端口。

后台 SPA 固定挂载在 `/admin/`。`/api/`、`/uploads/`、`/healthz` 使用顶级路径，
`/h5/` 保留给未来移动端。

## 一、发布产物

以版本 `1.0.0` 为例，交付给服务器：

```text
node-template-app-1.0.0.tar
server/docker-compose.yml
server/.env.production
```

如果服务器无法访问 Docker Hub，另交付：

```text
mysql-8.0.tar
redis-7-alpine.tar
```

`.env.production` 包含数据库、Redis 和 JWT 密钥，必须使用安全渠道传输，绝不能放进镜像或 Git 仓库。

## 二、构建机：生成业务镜像

以下命令在项目根目录执行。

### 1. 发布前检查

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm test
pnpm build
```

### 2. 确认服务器 CPU 架构

在服务器执行：

```bash
uname -m
```

| 服务器输出 | 构建参数 |
| --- | --- |
| `x86_64` | `linux/amd64` |
| `aarch64`、`arm64` | `linux/arm64` |

如果用 Apple 芯片 Mac 向常见 x86 Linux 服务器交付，必须使用 `linux/amd64`。

### 3. 构建一个镜像

```bash
docker buildx build \
  --platform linux/amd64 \
  --load \
  --build-arg VITE_APP_BASE=/admin/ \
  --build-arg VITE_API_BASE_URL=/api \
  -f server/Dockerfile \
  -t node-template-app:1.0.0 \
  .

docker image inspect node-template-app:1.0.0
```

生产默认值就是 `VITE_APP_BASE=/admin/` 和同域 `/api`。仅在明确改变部署前缀时
覆盖构建参数，并同步调整内部 Nginx；常规部署不要修改。

### 4. 导出与校验

```bash
docker save \
  -o node-template-app-1.0.0.tar \
  node-template-app:1.0.0

shasum -a 256 node-template-app-1.0.0.tar
```

保存 SHA-256 输出，上传到服务器后重新核对。

### 5. 完全离线时导出基础镜像

服务器可访问 Docker Hub 时跳过本节。

```bash
docker pull --platform linux/amd64 mysql:8.0
docker pull --platform linux/amd64 redis:7-alpine

docker save -o mysql-8.0.tar mysql:8.0
docker save -o redis-7-alpine.tar redis:7-alpine
```

## 三、服务器准备

确保安装 Docker Engine 和 Compose v2：

```bash
docker version
docker compose version
```

创建实例目录，以客户 A 为例：

```bash
sudo mkdir -p /srv/node-template/customer-a/server
sudo chown -R "$USER":"$USER" /srv/node-template/customer-a
chmod 750 /srv/node-template/customer-a
```

上传后的目录：

```text
/srv/node-template/customer-a/
├── node-template-app-1.0.0.tar
└── server/
    ├── docker-compose.yml
    └── .env.production
```

从模板创建并填写生产配置：

```bash
cp server/.env.production.example server/.env.production
chmod 600 server/.env.production
```

关键配置示例：

```dotenv
DEPLOYMENT_ID=customer-a-prod
COMPOSE_PROJECT_NAME=node-template-customer-a-prod

APP_IMAGE=node-template-app:1.0.0
VITE_APP_BASE=/admin/
VITE_API_BASE_URL=/api
ADMIN_BIND_ADDRESS=127.0.0.1
ADMIN_PORT=8080

MYSQL_DATABASE=node_template_customer_a
MYSQL_USER=node_app
MYSQL_PASSWORD=<高强度数据库密码>
MYSQL_ROOT_PASSWORD=<高强度MySQL Root密码>
DATABASE_URL=mysql://node_app:<URL编码后的数据库密码>@db:3306/node_template_customer_a

REDIS_PASSWORD=<高强度Redis密码>
CACHE_NAMESPACE=node-template:customer-a:prod
JWT_SECRET=<至少32位随机密钥>

CORS_ORIGIN=https://admin.example.com
API_BASE_URL=https://admin.example.com/api
ASSET_BASE_URL=https://admin.example.com
TRUST_PROXY_HOPS=2
```

注意：

- 数据库密码含 `@`、`:`、`/`、`#`、`%` 等特殊字符时，在 `DATABASE_URL` 中必须 URL 编码。
- 同一台主机的独立系统必须使用不同的 `COMPOSE_PROJECT_NAME`、`MYSQL_DATABASE`、`CACHE_NAMESPACE` 和宿主机端口。
- 首次上线后不要随意修改 Compose 项目名、数据库名和缓存前缀。
- `TRUST_PROXY_HOPS=2` 对应“宿主机 HTTPS Nginx → 容器内 Nginx → NestJS”；若没有外部反向代理，改为 `1`。

## 四、首次部署

在服务器实例目录执行：

```bash
cd /srv/node-template/customer-a
```

### 1. 加载镜像

```bash
sha256sum node-template-app-1.0.0.tar
docker load -i node-template-app-1.0.0.tar
```

在线服务器拉取基础镜像：

```bash
docker pull mysql:8.0
docker pull redis:7-alpine
```

离线服务器则执行：

```bash
docker load -i mysql-8.0.tar
docker load -i redis-7-alpine.tar
```

### 2. 检查配置并启动基础服务

```bash
docker compose \
  --env-file server/.env.production \
  -f server/docker-compose.yml \
  config --quiet

docker compose \
  --env-file server/.env.production \
  -f server/docker-compose.yml \
  up -d --no-build db redis
```

等待 `db`、`redis` 显示 healthy：

```bash
docker compose --env-file server/.env.production -f server/docker-compose.yml ps
```

### 3. 数据库迁移与首次初始化

生产环境只能运行已提交的迁移：

```bash
docker compose \
  --env-file server/.env.production \
  -f server/docker-compose.yml \
  --profile tools run --rm migrate
```

仅首次上线执行管理员初始化：

```bash
docker compose \
  --env-file server/.env.production \
  -f server/docker-compose.yml \
  --profile tools run --rm seed
```

确认可登录后，从 `.env.production` 删除 `SEED_ADMIN_PASSWORD`；以后仅在确需 Seed 时临时加入。

### 4. 启动业务镜像

```bash
docker compose \
  --env-file server/.env.production \
  -f server/docker-compose.yml \
  up -d --no-build app

docker compose --env-file server/.env.production -f server/docker-compose.yml ps
curl --fail http://127.0.0.1:8080/healthz
curl --fail http://127.0.0.1:8080/api/health
curl --fail http://127.0.0.1:8080/admin/
```

`/healthz` 检查内部 Nginx，`/api/health` 同时验证内部 Nginx 到 NestJS 的代理链路。
对外正式访问使用 `https://admin.example.com/admin/`，不要使用
`/admin/index.html`；`/admin` 和 `/admin/index.html` 会 301 到 `/admin/`。

## 五、配置 HTTPS

业务镜像默认绑定到 `127.0.0.1:8080`，由宿主机 Nginx、Caddy 或云负载均衡提供公网 HTTPS。

```nginx
server {
  listen 80;
  server_name admin.example.com;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name admin.example.com;

  ssl_certificate     /etc/nginx/tls/fullchain.pem;
  ssl_certificate_key /etc/nginx/tls/privkey.pem;
  client_max_body_size 6m;

  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
  }
}
```

仅对公网开放 80/443；不要开放 3000、3306、6379、8080。

## 六、升级与回滚

升级到 `1.0.1`：

1. 构建、导出、上传并加载 `node-template-app:1.0.1`。
2. 备份 MySQL 和上传文件，检查 Prisma 迁移 SQL。
3. 将 `.env.production` 的镜像改为：

```dotenv
APP_IMAGE=node-template-app:1.0.1
```

4. 运行迁移并更新容器：

```bash
docker compose --env-file server/.env.production -f server/docker-compose.yml \
  --profile tools run --rm migrate
docker compose --env-file server/.env.production -f server/docker-compose.yml \
  up -d --no-build app
```

应用回滚只需把 `APP_IMAGE` 改回上个版本再执行 `up -d --no-build app`。数据库迁移通常不能自动回滚；出现问题优先发布兼容修复，或按备份恢复预案处理。

## 七、常用运维命令

```bash
# 状态
docker compose --env-file server/.env.production -f server/docker-compose.yml ps

# 业务日志（同时包含 NestJS、内部 Nginx）
docker compose --env-file server/.env.production -f server/docker-compose.yml \
  logs -f --tail=200 app

# 重启业务镜像
docker compose --env-file server/.env.production -f server/docker-compose.yml restart app

# 停止但保留数据
docker compose --env-file server/.env.production -f server/docker-compose.yml down
```

不要执行 `docker compose down -v`，它会删除 MySQL、Redis、上传文件和日志命名卷。

双实例参数与备份恢复请继续参阅[同机多实例部署](multi-instance-deployment.md)和[备份与恢复](backup-recovery.md)。
