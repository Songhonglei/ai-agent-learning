# 开源版发布验收清单

证据日期：2026-10-21。用户已指定更新现有 Vercel 站点；Cowork 独立演进，本次不发布 Cowork。

## 2026-10-21 引用优化追加验收

- [x] PR #3 main 5fd6a03与c3cbea2验证候选tree一致，59服务端测试通过；本地浏览器明确区分缺引用错误/固定拒答/正常引用。
- [x] 新Preview、Production配置及正式站的4-2原误拒答问法均返回带合法引用的正文；超范围问题固定拒答。
- [x] 正式域名指向READY的dpl_jDquErNeX6pfhKtoZYKAvsYRDNxF；/assessment和课程深链200。
- [x] 生产创建时自动生效，手动promote409已current，不重复提升；检查并恢复Auto-assign=false，页面确认今后需手动发布。
- [x] 保留来源白名单、最多一次备用与原时限；无前端、依赖、SQL、密钥或学习档案变更。恢复点为前次兼容v2的HUP版本。
- 回执：[引用区分优化](../testing/2026-10-21-citation-clarity.md)。模型语义误判仍可能发生；本轮实测不是全量准确率统计。

## 2026-10-21 正式验收结果

- [x] 3600410（同既有已验证业务树）的新Preview真实课程回答、引用与超范围降级通过。
- [x] 使用Production变量暂存dpl_HUPzHez4E72JtRSfLmxo4zfmn6ZS，真实问答、前测草稿刷新、访客401/非法课程400通过；原生产域名此时仍指向旧部署。
- [x] 手动提升同一生产构建；my-agent-learning.vercel.app alias completed，域名ID为HUP，READY。
- [x] 正式域名1-1真实UI回答带figure-2-1/page-035；课程测评、前后测/对照入口、深链、JS/CSS 200，390px无横向溢出。
- [x] 当前日志3次真实问答200，无对外5xx；主403由备用接替，预期测试401/400不作生产故障。
- [ ] 真实目标学员试学、效果采集与真实登录云同步仍待独立验证；4-2一次相关问法安全降级保留为模型质量待优化。
- [x] 本轮不变更部署保护、自动分配域名设置、SQL或业务数据；密钥仅由用户保存。

完整证据：[正式发布验收](../testing/2026-10-21-production-release.md)。当前兼容v2的生产恢复基线为HUP；不能直接将旧Fg/v1当作安全的数据兼容回滚。下方各阶段旧候选、勾选状态和分支名为当时回执，当前结果以上方为准。

## 当前 main 合并验收

- [x] PR #1（开源拆分与AI保护）已merge到main：0986902；PR #2（全课程测评与Kimi备用）随后重定向main并merge：f8aa8c2。
- [x] 最新组合dc3659a的npm run verify：203单元、50服务端、25 E2E、构建全部通过。
- [x] f8aa8c2的完整文件树与dc3659a一致；当前main后续仅追加本轮验收/导航文档。
- [x] 本地main跟踪origin/main；仅删除本轮已合并的两个开发分支，保留完整提交历史。
- [x] 后续已完成真实备用模型与正式站发布验收，见上方HUP回执；合并通过与线上验收分别记录。
- 明细见 docs/testing/2026-10-21-main-integration.md。以下旧候选、分支名与测试数量保留为分阶段历史回执；当前功能基线以main为准。

## 固定目标与来源

- 当前工作区：/Users/songhonglei/space/ai-agent-learning-open，分支main；下方发布硬化分支仅为历史。
- GitHub：Songhonglei/ai-agent-learning；基于线上对应的 c31068b19d7725d942636a2235a2f2b017cd0e2a，保留访客学习、可选 Supabase 登录和档案同步。
- 生产域名：https://my-agent-learning.vercel.app/。
- Vercel：项目 ai-agent-learning / prj_ucgcGOonfoe5R3TeyJQsuIMXeZKg；账户 evansong / team_oLkYAq7dxp7LQY1L9Q5MqYa9。
- 回滚基准：dpl_FgNvtZuAJuygE8C3bEKeQ8VDKc7H（ai-agent-learning-8zmcgdffz-evansong.vercel.app）。

## 本地已验证

- [x] 独立 npm ci、package-lock；移除 Cowork 构建切换、SSO 和 PG 部署载荷。
- [x] npm run verify：41 文件 / 188 单元测试、34 服务端测试、构建、13 E2E 全部通过。
- [x] 12 课来源编号按当前课审核表白名单校验；伪造、跨课和无效编号阻断；明确拒答返回固定提示，漏引用/坏格式改为可重试错误。编号合规不代表语义事实已由人工核实。
- [x] 超时覆盖连接与响应体、上游错误安全提示、空响应、取消与离开页面、并发和访客限流均有回归。
- [x] Vercel 每实例每访客每分钟12次、同时1条、实例总并发4；浏览器55秒，服务端默认20秒、最多50秒，函数预算60秒。
- [x] Node 提供 dist 的生产预览冒烟通过；档案导入导出、迁移、跨标签同步与 360/768/1024/1440px 由 E2E 覆盖。
- [x] 无原书整本 PDF、企业数据库或实际凭据进入发布树；服务端环境变量沿用 Vercel，前端只使用允许公开的 Supabase 配置。
- [x] git diff --check 通过。
- 本地 dist 清单 SHA256：78beca30d77e22a3c037dc91309049ba1cf86d20f70301906d1581b99c643bc6（按文件路径及内容摘要排序生成；Vercel 构建包含其环境变量，摘要可不同）。

## 试学与发布记录

- [x] 浏览器代查：0-1互动/测验/完成后刷新恢复、来源、FAQ、错误降级、12课360px深链及无横向溢出。发现并修复移动首页窄列，新增360/390px定向E2E通过。
- [x] 首个候选 cd84e01 预览 dpl_4V1tjsgy9jcR9Yp5iYWZy4jDdjVm READY；课程深链和未登录档案401正常。
- [ ] 真实服务端问答成功：预览返回502 AI_CONNECTION_ERROR，旧正式站同样502；保持原站，待模型配置/上游恢复后复验。
- [ ] 相同候选源码的生产部署 READY；正式域名、静态资源、API 与错误日志复核。
- [ ] 真实目标学习者试学：约3小时仅为产品预期；尚未采集真人学习耗时或效果证据。浏览器代查不能替代真人试学。

## 保留边界

内存限流仅保护单个温实例，不是跨实例配额或账单硬上限。整课程前后测现已在独立后续分支实现，见下方新增测评发布约束；题卷尚未校准，不能作为课程因果效果证明。默认公开站只展示来源编号，不提供未授权整本 PDF 下载；只有明确可公开的文档才可配置 VITE_SOURCE_DOCUMENT_URL。

## 回滚

若生产出现无法学习、档案恢复损坏、API 大面积失败，使用 Vercel 已有生产部署回滚到上述基准，复核域名、课程深链和问答；保留失败部署与日志。不得修改或清空学习者 localStorage，不执行 Supabase 数据迁移或写入来配合此次发布。

## 最终候选回执（仅预览）

实现提交 1bb852ba308b8a7212e6eb8953dcc4e3eda727e5；预览 dpl_6MSnStGu57xkZXrQH1EPPpJAy1De READY，地址 https://ai-agent-learning-4rlfpvy9n-evansong.vercel.app/。浏览器验证移动首页可读、首课可见、4-2深链与来源卡片正常，非法课程请求400。草稿 PR：https://github.com/Songhonglei/ai-agent-learning/pull/1。未合并、未切换正式域名；模型故障与真人试学仍待完成。后续文档提交不改此实现提交。

## 新增测评发布约束（2026-10-21）

全课程测评候选在 codex/course-assessments-2026-10-21，尚未部署。验收见 docs/testing/2026-10-21-course-assessment.md。档案schema v2须与api/profile同批发布；新API拒绝旧v1写入。上线后回滚应保留v2读写兼容与数据保护，不能直接切回会丢弃测评字段的旧客户端/接口。本轮没有数据库迁移，也没有修改模型配置。

## Kimi 备用发布约束（2026-10-21后续）

- [x] 已实现服务端主备切换；50项服务端测试及构建通过，包含本地真实HTTP链路，不调用真实模型。
- [ ] 用户在Vercel将 AI_FALLBACK_API_KEY 填为 Secret，范围与其余5项一致（Production + Preview）。
- [ ] 部署包含备用实现的新提交，不能仅重部署仍无备用逻辑的旧生产版本；测评与档案v2仍须前后端同批。
- [ ] 在新预览验证真实Kimi调用、主模型故障时的备用、引用展示与取消，再验收正式版本。
- 备用配置与验收：README的Kimi变量表、docs/testing/2026-10-21-kimi-fallback.md。中国站开放平台API Key与Kimi Code订阅密钥不可混用。本轮不替换主模型配置或Supabase变量。
