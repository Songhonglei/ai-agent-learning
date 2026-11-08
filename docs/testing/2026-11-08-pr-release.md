# 2026-11-08 复查、PR与发布

用户明确授权先复查，再提交/推送分支、创建PR、跑通远端CI，随后合并并更新Vercel。第一轮本地维护与ego验收记录见[维护验收](2026-11-08-cloud-sync-reliability.md)。

## 复查结论

基线origin/main为`da22264`，候选分支为`fix/cloud-sync-reliability-20261108`。复查代码及测试后未发现阻断问题：

- 退出、换号和切换存储会中止旧会话并拒绝迟到结果；认证初始化结果也受序号保护。
- 条件PATCH同时过滤账号及数据库更新时间，首次插入忽略重复键；读操作不更新时间，同毫秒写入仍推进标记。
- 自动合并保留不同字段/题目的改动；同字段竞争保留已保存值，已提交全课程测评不被草稿覆盖；同页失败重试保留原始编辑基线。
- 认证、REST和响应体共享服务端时限；超时后迟到认证不能继续写入。诊断不包含凭据或上游正文。
- 内部标记不写入学习档案或备份；无数据库字段/迁移、模型配置或问答实现变更。

复查重新执行`npm run verify:core`：44文件/219单元、64服务端、TypeScript/Vite构建通过；`npm audit`为0项。现有25项浏览器回归交由远端Application CI运行，使用运行器预装Chrome，不下载Chromium。此阶段不把CI配置存在视为CI已经通过。

## 发布前基线

ego-browser核对Vercel的`evansong/ai-agent-learning`项目，正式域名为`my-agent-learning.vercel.app`；当前生产`dpl_jDquErNeX6pfhKtoZYKAvsYRDNxF`，源码`5fd6a03`，READY。项目尚未连接Git。该部署保留为兼容v2的恢复基线。

Vercel连接器在该团队下未列出此项目，但已登录的控制台可正常访问；后续发布需明确核对同一项目ID及环境。不能改换项目、连接其他仓库或修改模型/Supabase凭据来绕过权限问题。

## PR、CI与发布结果

进行中；完成后追加准确的提交、PR、workflow运行、部署ID及实际验收边界。真实Supabase/RLS、真实账号写入及模型质量只按本轮实际验证记录，不复用历史通过结论。
