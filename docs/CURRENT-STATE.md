# 开源课程站 当前状态

日期：2026-10-21。

## 独立知识映射与模型配置

2026-10-21用户要求把本项目与“课坊”custom-course-platform分别接入OpenViking，Cowork不接入。已登记project_code=ai-agent-learning-open-source，workspace_path=/Users/songhonglei/space/ai-agent-learning-open-source，独立scope=viking://resources/pilot/ai-agent-learning-open-source/current；复用全局openviking、本机服务和local-development身份，不另建MCP、不加入定时调度。精选维护资料10份，另附资料使用规则；导入/检索验收结果以项目外evidence为准。旧ai-agent-learning索引继续保存历史资料。

用户已确认Kimi API Key保存完成，浏览器核对AI_FALLBACK_API_KEY在Production和Preview均存在且为Secret，未读取密钥值。后续真实模型/部署验收记录单独追加；不能把变量存在视为问答成功。维护索引不接入网站课程助教的审核来源链路。使用说明见OPENVIKING.md。

## 当前 main 基线

2026-10-21按用户要求整理PR并合入main：[#1](https://github.com/Songhonglei/ai-agent-learning/pull/1)合并提交0986902，随后将[#2](https://github.com/Songhonglei/ai-agent-learning/pull/2)从依赖分支改为main并合并为f8aa8c2。保留merge提交与原始功能历史；本地已切换main并跟踪origin/main，两个本轮已合并开发分支已从本地和远端删除。

合并前对最新组合dc3659a实际执行npm run verify：43文件/203单元、50服务端、25 E2E、TypeScript/Vite构建全部通过。合并提交f8aa8c2与该候选的完整Git文件树一致，后续仅补本文、发布清单和验收记录。详情见 [main合并验收](testing/2026-10-21-main-integration.md)。

当前main已包含独立开源版、AI引用/异常保护、全课程前后测与对照、Kimi一次备用逻辑。真实Kimi调用、真实Supabase账号数据链路、目标学员试学和正式站发布验收仍待完成；本轮未手动触发Vercel发布，未核验合并后自动部署状态，也未读取或核对用户是否已保存密钥。Cowork保持独立，不同步这些变更。

下方按阶段保留历史记录，其中“草稿PR”“未合并”“尚未实现fallback”等描述仅代表当时状态；当前代码与合并状态以本节和GitHub main为准。

- 基线来源：历史 ai-agent-learning-unified/c31068b；拆分时核心 API 文件 SHA1 与当时 Vercel 部署一致。旧目录现已归档至 /Users/songhonglei/space/project-backups/ai-agent-learning/2026-10-21-cleanup，当前项目原路径保留。
- 访客可学习与问答，Supabase 登录和同步可选；发布到既有 Vercel 项目 ai-agent-learning。已分离 Cowork 构建入口、SSO App、PG 后端和部署脚本，已完成 AI 修复和本地验收，线上验收受既有模型故障阻塞。
- 两项目独立仓库、独立 package-lock、独立 src/server 和测试。没有跨项目源文件导入或自动同步。
- 固定12课，整体学习时长约3小时；本轮已实现覆盖12课的全课程前测、后测与对照，见下方新进展。
- 本项目已独立登记OpenViking；原ai-agent-learning索引只作为历史，当前实现与运行状态仍以本项目源码和本次验收为准。
- 验证结果与当前提交后续记录在本文件及 docs/release/。

## 独立基线验证

2026-10-21：npm run verify 全通过：188 单元测试、34 服务端测试、13 E2E 与构建；Node dist 生产预览冒烟通过。
拆分基线 cd84e01 已提交并推送独立发布分支。

移动端首页标题窄列问题已修复，新增 360/390px 可读性及首课可见性 E2E 通过；两版人工移植该 CSS 修复后分别构建通过。原有13项 E2E 全量通过，加新增1项定向通过（未重复执行全量）。

预览 dpl_4V1tjsgy9jcR9Yp5iYWZy4jDdjVm 已 READY，浏览器可打开课程深链，未登录档案 API 返回401；真实问答返回502 AI_CONNECTION_ERROR。旧正式域名真实问答同样502，属于既有故障，用户随后确认阿里云模型暂不可用，需晚些生效；另计划提供Kimi fallback（配置未提供，尚未实现）；Vercel 将相关配置标记为 sensitive，未读取密钥或改写配置。正式域名未切换，待用户确认模型服务与模型名。

浏览器代查完成0-1互动/测验/完成后刷新恢复、无模型时FAQ与安全提示、12课360px深链及来源卡片；不是目标学员真人试学，不能证明实际学习耗时或效果。

## 交付回执

- 实现候选：1bb852ba308b8a7212e6eb8953dcc4e3eda727e5。草稿 PR：https://github.com/Songhonglei/ai-agent-learning/pull/1。
- 最终预览：https://ai-agent-learning-4rlfpvy9n-evansong.vercel.app/；dpl_6MSnStGu57xkZXrQH1EPPpJAy1De，READY。
- 浏览器确认该预览在360px标题宽294px、高37px，首课入口位于约565px；4-2深链及4个来源卡片正常，无横向溢出；伪造课程编号被400 INVALID_QUESTION拦截，没有调用模型。
- 真实问答故障仍待恢复：此前同一服务代码的预览和旧正式站均502。正式域名没有切换，PR未合并。该回执为文档补记，不改变已测试的实现候选。
- 原历史项目的拆分决策与经验已同步 OpenViking，13/13来源读回一致；本项目仍未单独注册。临时预览服务与浏览器任务已关闭。

## 2026-10-21 全课程测评

本轮范围为开源版；Cowork 未同步。题卷 course-2026-10-v1，前后各24题（每课2题，题干不同），保留原36道练习与1-1局部自测。提交前不反馈对错、支持逐题导航及草稿续答；首次提交锁定，12课完成后开放后测。总分、正确率、六主题、逐课对照与后测复习入口已实现；补测或缺基线不计算提升。题卷未作统计难度校准，结果仅供自测复盘。

档案schema升级v2，自动迁移v1，测评结果与旧单课结果分开；备份导入与跨标签合并接入，云端保存排队防旧响应覆盖。api/profile拒绝旧客户端v1写入，避免降级丢字段；须前后端同批发布，未执行真实Supabase写入或SQL迁移。

实际 npm run verify 全通过：43文件/203单元测试、35服务端测试、25 E2E与构建（含11项新增测评E2E）。dist生产预览冒烟通过。浏览器实操与测试细节见 docs/testing/2026-10-21-course-assessment.md。

本轮在 codex/course-assessments-2026-10-21 开发，尚未更新Vercel正式站；本地预览端口4182。旧部署回执属于上一阶段，不代表新测评已经上线。

浏览器最终回执：实际前测23/24，逐课完成12课记录后后测24/24，对照+1分/+4.2个百分点；1440px浅色、360px深色表格已查看。导出后导入4182独立空存储，取消不写、确认完整恢复v2结果。截图及详细报告已纳入docs/testing/。旧项目OpenViking资料指针同步完成，13/13原文读回一致；新项目尚未单独登记。

交付：实现提交5cd661b92df990ae490166d73a8813d0156d385f已推送；草稿PR https://github.com/Songhonglei/ai-agent-learning/pull/2 以独立开源基线PR #1为父分支。浏览器任务已结束，开发服务4181已停止，生产构建预览4182保留供本机查看。PR未合并、正式站未更新。

## 2026-10-21 Kimi 备用配置

用户要求通过 ego-browser 配好 Vercel fallback，仅自行填写 Kimi API Key。已补齐服务端备用逻辑：主模型超时、限流、网络/上游/空内容/引用失败后最多尝试一次备用；取消或有效资料未覆盖提示不切换，备用沿用引用校验。备用存在时主模型最多20秒、整链最多50秒；未填备用密钥则保持原主模型行为。

配置采用 Kimi 中国站开放平台 https://api.moonshot.cn/v1、kimi-k2.6、openai-chat-completions、30000ms、thinking=disabled；对应 AI_FALLBACK_BASE_URL/API_STYLE/MODEL/TIMEOUT_MS/THINKING。依据2026-10-21官方文档核对，kimi-k2.5已下线。密钥变量 AI_FALLBACK_API_KEY 由用户在 Vercel 填写为 Secret，不读取或写入本地；主模型及Supabase配置不变。

本轮实际50项服务端测试和构建通过，包含真实本地HTTP链路的主备切换、密钥隔离与引用验证；没有真实Kimi密钥，未执行真实Kimi调用。浏览器保存与交付状态详见 docs/testing/2026-10-21-kimi-fallback.md。代码尚未部署正式站；变量保存与部署生效是两步，不把旧部署的Redeploy当成已包含新备用逻辑。
