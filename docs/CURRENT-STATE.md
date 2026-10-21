# 开源课程站 当前状态

日期：2026-10-21。

- 基线来源：ai-agent-learning-unified；核心 API 文件 SHA1 与现有 Vercel 部署一致。旧目录未移动或覆盖。
- 访客可学习与问答，Supabase 登录和同步可选；发布到既有 Vercel 项目 ai-agent-learning。已分离 Cowork 构建入口、SSO App、PG 后端和部署脚本，正在完成 AI 修复与发布验收。
- 两项目独立仓库、独立 package-lock、独立 src/server 和测试。没有跨项目源文件导入或自动同步。
- 固定12课，整体学习时长约3小时；整课程测评方案尚未实施。
- 本项目尚未单独登记 OpenViking；原 ai-agent-learning 索引只作为旧工作区历史，不能证明本项目运行状态。
- 验证结果与当前提交后续记录在本文件及 docs/release/。

## 独立基线验证

2026-10-21：npm run verify 全通过：188 单元测试、34 服务端测试、13 E2E 与构建；Node dist 生产预览冒烟通过。
拆分变更待提交；发布状态以本项目后续记录为准。
