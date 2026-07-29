# 同机多实例部署

同一台 Docker 主机部署两套相互独立的系统时，必须同时隔离 Docker
资源、MySQL 数据、Redis Key、宿主机端口和业务文件。只修改其中一项并不完整。

## 隔离参数

每套部署都必须独立配置：

| 参数 | 用途 | 是否允许两套相同 |
| --- | --- | --- |
| `DEPLOYMENT_ID` | 应用部署标识和容器标签 | 不允许 |
| `COMPOSE_PROJECT_NAME` | Compose 网络、容器和命名卷前缀 | 不允许 |
| `MYSQL_DATABASE` | MySQL 逻辑数据库名 | 不允许 |
| `DATABASE_URL` | 应用实际数据库连接 | 不允许指向同一业务库 |
| `CACHE_NAMESPACE` | 所有 Redis Key 的全局前缀 | 不允许 |
| `MYSQL_HOST_PORT` | MySQL 宿主机端口 | 同机运行独立 MySQL 时不允许 |
| `REDIS_HOST_PORT` | Redis 宿主机端口 | 同机运行独立 Redis 时不允许 |
| `ADMIN_PORT` | 单业务镜像（前端和 API）宿主机端口 | 不允许 |

`CACHE_NAMESPACE` 会由缓存适配器统一加在所有业务 Key 前面。代码中的
`auth:session:*`、`auth:captcha:*`、`auth:login-fail:*` 和
`system-setting:public` 是前缀之后的业务分类，
不需要分别配置。

例如：

```text
node-template:customer-a:prod:auth:session:15
node-template:customer-b:prod:auth:session:15
```

相互独立的系统必须使用不同前缀。同一套系统做水平扩容时，所有 Server
实例必须使用相同前缀，才能共享登录会话。

不要把 Redis 数字数据库编号当作唯一隔离手段。Redis Cluster 只支持 DB 0，
`FLUSHALL` 也会越过数字数据库边界；严格隔离仍应使用唯一前缀、独立 ACL，
高安全场景使用独立 Redis 实例。

## 两套独立 Compose 示例

从 `server/.env.production.example` 分别创建：

```text
server/.env.customer-a.production
server/.env.customer-b.production
```

系统 A 的关键配置：

```dotenv
DEPLOYMENT_ID=customer-a-prod
COMPOSE_PROJECT_NAME=node-template-customer-a-prod

MYSQL_DATABASE=node_template_customer_a
DATABASE_URL=mysql://node_app:<URL编码后的密码>@db:3306/node_template_customer_a
CACHE_NAMESPACE=node-template:customer-a:prod

MYSQL_HOST_PORT=3306
REDIS_HOST_PORT=6379
ADMIN_PORT=8080
```

系统 B 的关键配置：

```dotenv
DEPLOYMENT_ID=customer-b-prod
COMPOSE_PROJECT_NAME=node-template-customer-b-prod

MYSQL_DATABASE=node_template_customer_b
DATABASE_URL=mysql://node_app:<URL编码后的密码>@db:3306/node_template_customer_b
CACHE_NAMESPACE=node-template:customer-b:prod

MYSQL_HOST_PORT=3307
REDIS_HOST_PORT=6380
ADMIN_PORT=8081
```

两套系统还必须分别使用不同的 MySQL、Redis、JWT 和管理员密码。

分别检查和启动：

```bash
docker compose --env-file server/.env.customer-a.production \
  -f server/docker-compose.yml config
docker compose --env-file server/.env.customer-a.production \
  -f server/docker-compose.yml up -d db redis
docker compose --env-file server/.env.customer-a.production \
  -f server/docker-compose.yml --profile tools run --rm migrate
docker compose --env-file server/.env.customer-a.production \
  -f server/docker-compose.yml --profile tools run --rm seed
docker compose --env-file server/.env.customer-a.production \
  -f server/docker-compose.yml up -d app

docker compose --env-file server/.env.customer-b.production \
  -f server/docker-compose.yml config
docker compose --env-file server/.env.customer-b.production \
  -f server/docker-compose.yml up -d db redis
docker compose --env-file server/.env.customer-b.production \
  -f server/docker-compose.yml --profile tools run --rm migrate
docker compose --env-file server/.env.customer-b.production \
  -f server/docker-compose.yml --profile tools run --rm seed
docker compose --env-file server/.env.customer-b.production \
  -f server/docker-compose.yml up -d app
```

根目录的 `pnpm prod:*` 命令固定使用 `server/.env.production`。多实例部署应使用
上面的显式 `--env-file` 命令，避免操作错实例。

## 升级时不能随意修改

首次上线后，把以下参数视为持久化身份：

```text
COMPOSE_PROJECT_NAME
MYSQL_DATABASE
DATABASE_URL 中的数据库名
CACHE_NAMESPACE
```

- 修改 `COMPOSE_PROJECT_NAME` 会让 Compose 指向另一组网络和命名卷，看起来像数据丢失。
- 修改 `MYSQL_DATABASE` 或 `DATABASE_URL` 会让应用连接另一套数据库。
- 修改 `CACHE_NAMESPACE` 会让已有会话和验证码不可见，所有用户需要重新登录。

每次发布前先渲染 Compose 配置并核对项目名、端口、数据库名和缓存前缀，再执行
迁移或启动命令。不要对不确定的实例运行 `docker compose down -v`。
