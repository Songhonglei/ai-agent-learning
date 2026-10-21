# 开源课程站 当前状态

日期：2026-10-21。

## 默认英文与中文README（2026-10-21）

按用户要求，README.md改为完整英文默认入口；原中文正文完整移至README.zh-CN.md，仅在标题下增加语言切换。两个文件顶部互相链接，GitHub Pages介绍页与Vercel课程站、前后测、模型无关主备配置及数据边界均保留。章节数量、代码块、环境变量集合、业务链接逐项一致，所有本地Markdown链接存在；diff检查通过。仅文档变更，不改变课程界面语言、代码、模型配置或部署；后续功能说明需同步维护两个README。

## 仓库入口与可替换模型说明（2026-10-21）

用户纠正入口定位：GitHub Pages是项目亮点/产品介绍页，Vercel是实际课程学习站，两者同时保留。已恢复GitHub About homepage为https://songhonglei.github.io/ai-agent-learning/，About描述保留课程前后测/结果对照，AI助教改称可配置主模型与fallback备用模型，不绑定具体provider；GitHub API读回确认。README顶部并列两个入口并解释分工，仍保留Vercel测评深链。

README与config/ai.env.example改为供应商无关的地址/模型占位、主备配置表与可选thinking说明；以当前代码支持的openai-chat-completions和runway-bedrock为兼容边界，不宣称任意协议自动可用。使用虚拟密钥的纯本地配置解析与双入口检查通过、diff检查通过；未调用模型。历史发布/验收记录中的实际模型名称保留作证据；本轮没有业务代码、正式模型配置、Vercel部署或GitHub Pages内容变更。下方之前“homepage改为Vercel”的记录已被本次入口决定取代。

## 引用区分优化正式基线

按用户“代价不高直接更新”要求，完成两个服务端模块的低侵入优化，不改前端、依赖、数据库或客户端answer/citations接口。模型输出改为status/answer/citations JSON并兼容旧格式；只有明确拒答才视为资料未覆盖，漏引用返回AI_SOURCE_MISSING、坏结构返回AI_RESPONSE_INVALID，可沿用已有一次备用，不新增重试，来源白名单不变。各课提示词使用本课来源ID，不再复用1-1示例。

59项服务端测试和本地HTTP/浏览器缺引用、明确拒答、重试恢复通过。首个仅加强提示的c17候选真实复验仍漏引，正确显示新错误；最终JSON候选c3cbea2真实4-2原问法和超范围拒答通过。PR #3已merge到main 5fd6a03，tree与验证候选完全一致；生产dpl_jDquErNeX6pfhKtoZYKAvsYRDNxF已READY并成为正式https://my-agent-learning.vercel.app/当前部署，生产配置及正式域名原问法均带outline-280-258/page-280/page-312回答，超范围问题固定拒答。

本轮生产创建后被Vercel自动设为current，手动提升返回already current 409，不重复操作；重新发现Auto-assign Enabled并恢复已知原始false，网页确认今后需手动提升。没有改变当前正式部署或保护规则。原HUP作为兼容v2恢复点保留。语义范围仍由模型判断，不能据此保证所有误拒答消失。回执与截图见docs/testing/2026-10-21-citation-clarity.md；下方之前的4-2问题和HUP正式基线保留为历史记录。

2026-10-21仓库展示更新：按用户要求，GitHub Songhonglei/ai-agent-learning的About描述已补充课程前后测/结果对照、来源引用AI助教和Kimi备用；homepage已由GitHub Pages改为https://my-agent-learning.vercel.app/，GitHub API读回确认。README顶部显式标注Vercel在线体验，并增加前测/后测/对照直达链接和五项功能概览；GitHub Pages仅保留为项目介绍。仅维护资料和仓库元信息变更，没有业务源码、部署或学习数据改动；文档检查后推送main。

## 最新正式基线

用户重新保存Code密钥后，3600410的新Preview真实问答、审核引用和超范围拒答通过；Production配置暂存后真实问答200，日志primary HTTP_403而对外200，确认Kimi备用接替成功。dpl_HUPzHez4E72JtRSfLmxo4zfmn6ZS已READY并手动提升，正式https://my-agent-learning.vercel.app/解析到该部署；12课全课程前后测、结果对照、档案v2和Kimi备用已上线。正式域名1-1真实UI回答与引用通过，测评、课程深链及JS/CSS均200，390px无横向溢出。没有改变项目原有禁用自动分配生产域名的设置、部署保护或主模型配置。

真实登录账号云同步与目标学员真人试学尚未新验收；正式4-2一次相关问法被无引用安全降级，已保留为回答质量待优化项，不能将所有200称为正确回答。阿里云主模型仍出现403；Kimi备用已可用。详细证据、部署ID、测试边界与截图见docs/testing/2026-10-21-production-release.md。下方“未上线”“401”“待更新密钥”等均为此前阶段的状态，以上方正式回执为准。

## 本地目录更名

用户要求将space下ai-agent-learning-open-source目录改为ai-agent-learning-open，已原位移动至/Users/songhonglei/space/ai-agent-learning-open。OpenViking注册工作区及资料策略已更新，project_code和scope继续使用ai-agent-learning-open-source，避免重建既有索引；GitHub Songhonglei/ai-agent-learning、Vercel项目和站点不变。移动前后HEAD b118e2a、Git状态及270个已跟踪文件散列一致；依赖、构建和本机配置随目录保留。预览从新目录重启，仍使用127.0.0.1:4182；首页、/assessment及JS/CSS均200，不影响同源浏览器档案。无业务源码改动或线上发布。导航/维护资料随后更新，不将这些文档差异混同为移动损坏。


## 独立知识映射与模型配置

最新Kimi验收（2026-10-21）：用户在同一Ego任务页完成验证后，已成功保存AI_FALLBACK_BASE_URL=https://api.kimi.com/coding/v1与AI_FALLBACK_MODEL=kimi-for-coding，范围均为Production + Preview；其余OpenAI兼容协议、30秒和thinking=disabled保留。两条API_KEY仍为用户填写的Secret，未读取密钥。新预览dpl_EhySM543JmXCYkLiCZgoAx5UdofE（https://ai-agent-learning-igif96795-evansong.vercel.app/，远端b118e2a）已READY，浏览器/assessment正常；1-1真实课程问答失败。Vercel展开运行日志明确显示primary HTTP_403、fallback HTTP_401，External APIs确认备用实际请求api.kimi.com/coding/v1/chat/completions。Kimi控制台只读元数据可见本账号会员权益与生效Key，但不能证明Vercel的Secret内容相同。仅凭401不武断判断具体原因（认证/账号或模型权限均需区分）；没有重复重试或伪装客户端身份。已交还Vercel密钥列表，请用户自行核对并重新保存Preview和Production的有效Code Key，待其确认后创建新预览再验收。正式域名尚未更新，真实问答仍未通过。依据：https://www.kimi.com/code/docs/en/kimi-code/error-reference.html 。本地df9a12b仅追加目录更名说明，业务代码与远端b118e2a一致，本轮没有业务代码改动或重复跑全量测试。

2026-10-21接入验收：10份白名单资料及1份资料规则完成首次入库，11/11 canonical原文逐份读回一致。全新STDIO MCP会话验证只读工具、双项目路由、code/workspace不匹配与跨scope拒绝、Cowork未注册；本项目6/6问题前三条检索后原文回读符合事实。课坊6题中5题前三条命中，剩余1题按流程扩大至8条，在第5条找到并回读完整依据。未创建新的Codex UI聊天；本聊天已实际调用原生MCP完成resolve/find/read。共享身份只有路由范围限制，不声称原生账号隔离。回执：~/.openviking-pilot/projects/ai-agent-learning-open-source/evidence/course-projects-mcp-check.json。

本次main已到2119b75并推送，新增仅记录primary/fallback角色及HTTP状态码的安全诊断，51项服务端测试通过；不记录密钥、请求正文或供应商响应内容。c8cc4a7预览dpl_ZeiDWywieWHsBP5hgzMApek48zaM已READY，浏览器/assessment可用，但真实课程问答仍502 AI_UPSTREAM_ERROR；Vercel网页运行日志确认该错误，MCP日志接口403不能视为空日志。2119b75诊断预览dpl_AVAFcNdQqgbBNmk2Y6TcDyX6NKPH也已READY，尚未对其发起真实问答，不重复调用已知可能错配的凭据。正式域名未切换。

前一阶段凭据来源待确认，用户随后已明确为Kimi Code订阅；配置保存和真实验收结果以上方最新记录为准。2026-10-21官方Kimi Code文档明确其订阅密钥与开放平台不通用，Code权益面向编程场景，自有产品模型集成应使用开放平台；当前Moonshot配置不能据此视为匹配。未擅改密钥或伪装客户端身份。依据：https://www.kimi.com/code/docs/en/ 。真实Kimi及正式发布验收仍未通过。

2026-10-21用户要求把本项目与“课坊”custom-course-platform分别接入OpenViking，Cowork不接入。已登记project_code=ai-agent-learning-open-source，workspace_path=/Users/songhonglei/space/ai-agent-learning-open，独立scope=viking://resources/pilot/ai-agent-learning-open-source/current；复用全局openviking、本机服务和local-development身份，不另建MCP、不加入定时调度。精选维护资料10份，另附资料使用规则；导入/检索验收结果以项目外evidence为准。旧ai-agent-learning索引继续保存历史资料。

用户已确认Kimi API Key保存完成，浏览器核对AI_FALLBACK_API_KEY在Production和Preview均存在且为Secret，未读取密钥值。后续真实模型/部署验收记录单独追加；不能把变量存在视为问答成功。维护索引不接入网站课程助教的审核来源链路。使用说明见OPENVIKING.md。

## 当前 main 基线

2026-10-21按用户要求整理PR并合入main：[#1](https://github.com/Songhonglei/ai-agent-learning/pull/1)合并提交0986902，随后将[#2](https://github.com/Songhonglei/ai-agent-learning/pull/2)从依赖分支改为main并合并为f8aa8c2。保留merge提交与原始功能历史；本地已切换main并跟踪origin/main，两个本轮已合并开发分支已从本地和远端删除。

合并前对最新组合dc3659a实际执行npm run verify：43文件/203单元、50服务端、25 E2E、TypeScript/Vite构建全部通过。合并提交f8aa8c2与该候选的完整Git文件树一致，后续仅补本文、发布清单和验收记录。详情见 [main合并验收](testing/2026-10-21-main-integration.md)。

当前main已包含独立开源版、AI引用/异常保护、全课程前后测与对照、Kimi一次备用逻辑。真实Kimi调用、真实Supabase账号数据链路、目标学员试学和正式站发布验收仍待完成；本轮已创建预览并核对密钥变量存在，结果见上节；正式站仍未更新。Cowork保持独立，不同步这些变更。

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
