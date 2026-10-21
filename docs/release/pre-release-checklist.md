# 开源版发布验收清单

证据日期：2026-10-21。用户已指定更新现有 Vercel 站点；Cowork 独立演进，本次不发布 Cowork。

## 固定目标与来源

- 工作区：ai-agent-learning-open-source，分支 codex/release-hardening-2026-10-21。
- GitHub：Songhonglei/ai-agent-learning；基于线上对应的 c31068b19d7725d942636a2235a2f2b017cd0e2a，保留访客学习、可选 Supabase 登录和档案同步。
- 生产域名：https://my-agent-learning.vercel.app/。
- Vercel：项目 ai-agent-learning / prj_ucgcGOonfoe5R3TeyJQsuIMXeZKg；账户 evansong / team_oLkYAq7dxp7LQY1L9Q5MqYa9。
- 回滚基准：dpl_FgNvtZuAJuygE8C3bEKeQ8VDKc7H（ai-agent-learning-8zmcgdffz-evansong.vercel.app）。

## 本地已验证

- [x] 独立 npm ci、package-lock；移除 Cowork 构建切换、SSO 和 PG 部署载荷。
- [x] npm run verify：41 文件 / 188 单元测试、34 服务端测试、构建、13 E2E 全部通过。
- [x] 12 课来源编号按当前课审核表白名单校验；伪造、跨课和无效编号阻断；无引用回答降级到固定提示。编号合规不代表语义事实已由人工核实。
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

内存限流仅保护单个温实例，不是跨实例配额或账单硬上限。整课程前后测尚未开发；现有单课前后测和练习不能证明整体学习效果。默认公开站只展示来源编号，不提供未授权整本 PDF 下载；只有明确可公开的文档才可配置 VITE_SOURCE_DOCUMENT_URL。

## 回滚

若生产出现无法学习、档案恢复损坏、API 大面积失败，使用 Vercel 已有生产部署回滚到上述基准，复核域名、课程深链和问答；保留失败部署与日志。不得修改或清空学习者 localStorage，不执行 Supabase 数据迁移或写入来配合此次发布。
