# Admin

Vue 3 + Vite 管理后台，包含登录、动态菜单/路由、按钮权限、用户、角色、菜单、部门、数据范围、审计日志和个人中心。

开发环境由 Vite 把 `/api` 代理到本机 Server。可选的独立前端镜像使用 `admin/Dockerfile` 构建，并由 `admin/nginx.conf` 提供 SPA 静态资源、安全响应头、API 和上传文件代理。

`VITE_APP_BASE` 控制 Vite 基路径：本地开发默认 `/`，生产构建默认
`/admin/`。正式后台地址是 `https://域名/admin/`，Vue Router 使用
`BASE_URL`；`/api/`、`/uploads/`、`/healthz` 不放到 `/admin/` 下。

生产部署、HTTPS 入口与故障排查见根目录 `docs/`。
