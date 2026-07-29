# 文档中心

| 文档 | 适用场景 |
| --- | --- |
| [架构说明](architecture.md) | 了解组件、网络边界、数据和安全模型 |
| [开发指南](development.md) | 本地启动、质量检查和新增业务模块 |
| [生产部署](deployment.md) | 首次上线、升级、验证和代码回滚 |
| [Docker 镜像部署手册](image-deployment.md) | 构建、导出、上传镜像并在生产服务器首次部署或升级 |
| [同机多实例部署](multi-instance-deployment.md) | 在同一 Docker 主机隔离多套系统 |
| [日常运维](operations.md) | 状态检查、日志、监控和日常管理 |
| [安全操作](security-operations.md) | 密钥轮换、代理边界和安全事件处理 |
| [备份恢复](backup-recovery.md) | MySQL、上传文件的备份、恢复和演练 |
| [故障排查](troubleshooting.md) | 启动、登录、权限、代理和上传问题 |

生产变更前至少阅读“生产部署”“安全操作”和“备份恢复”。文档中的域名、端口、镜像名和保留周期都是模板值，复制项目后应按实际环境修改。
