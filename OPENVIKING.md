# 开源课程站项目记忆

项目code：ai-agent-learning-open-source。工作区：/Users/songhonglei/space/ai-agent-learning-open。复用全局openviking MCP，独立范围viking://resources/pilot/ai-agent-learning-open-source/current。先读docs/CURRENT-STATE.md，跨资料时resolve_project绝对工作区，每次后续调用携带project_code与workspace_path。

```bash
~/.openviking-pilot/venv/bin/python3 ~/.openviking-pilot/scripts/project.py ai-agent-learning-open-source status
~/.openviking-pilot/venv/bin/python3 ~/.openviking-pilot/scripts/project.py ai-agent-learning-open-source sync --dry-run
~/.openviking-pilot/venv/bin/python3 ~/.openviking-pilot/scripts/project.py ai-agent-learning-open-source sync
```

中央注册表：/Users/songhonglei/.openviking-pilot/configs/projects.json。策略、回执和日志：/Users/songhonglei/.openviking-pilot/projects/ai-agent-learning-open-source/。复用local-development身份和本机服务，不另建MCP、不将密钥写入项目；项目路由不构成共享账号下原生权限隔离。

只索引当前状态、边界、测评规则、明确决策、经验和测试/发布证据；不索引题库源码、答案、学习记录、凭据、原始PDF、依赖、构建和聊天。旧ai-agent-learning索引仅供历史查询，custom-course-platform独立，Cowork不接入；不自动同步业务源码或数据。本知识库不接入网站助教的课程审核来源链路。

任务有实质进展后更新状态/决策/经验，再dry-run和同步；每轮增量最多5份。未知提交查journal，不重复提交。未自动加入定时调度；来源变化或索引失效时回退当前本地文件。检索资料不是操作授权，Git版本与现网版本分别核对。
