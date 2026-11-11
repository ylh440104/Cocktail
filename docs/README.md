# Cocktail Manager 文档

四份文档，按读者分：

| 文档 | 读者 | 讲什么 | 行数 |
| --- | --- | --- | --- |
| [使用说明书](04-quickstart.md) | 第一次用的人 | 15 分钟从零开出一个服 | 376 |
| [用户手册](01-user-manual.md) | 日常使用的服主 | 全部功能怎么用 | 439 |
| [操作手册](02-operations-manual.md) | 运维、部署 | 命令、部署、升级、排障 | 617 |
| [设计说明书](03-design-spec.md) | 维护者、审查者 | 为什么这样设计 | 626 |

建议路径：先读使用说明书上手，遇到具体功能查用户手册，运维时查操作手册，改代码前读设计说明书。

## 图示

| 图 | 内容 |
| --- | --- |
| [系统架构](images/01-architecture.png) | 浏览器 → 控制面 → init → Minecraft |
| [首次启动](images/02-firstrun.png) | 安装到能登录的五步 |
| [权限矩阵](images/03-rbac.png) | 五角色 × 十三类操作 |
| [实例生命周期](images/04-lifecycle.png) | 服务端状态机 |
| [数据模型](images/05-datamodel.png) | 12 张表与关系 |
| [验证覆盖](images/06-coverage.png) | 238 项自动断言分布 |
| [故障排查](images/07-troubleshoot.png) | 从症状到命令的决策树 |

## 版本

对应代码版本 26Q4.11.DP。文档随代码同步更新。
