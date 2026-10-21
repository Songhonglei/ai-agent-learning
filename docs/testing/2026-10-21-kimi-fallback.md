# Kimi 备用链路与 Vercel 配置回执

日期：2026-10-21。范围：独立开源课程站，不修改 Cowork。

最终状态：用户再次保存Code密钥后，3600410的新Preview及Production暂存真实问答均成功并显示审核引用；生产日志显示主模型403后对外200，确认备用接替。Production dpl_HUPzHez4E72JtRSfLmxo4zfmn6ZS已提升至https://my-agent-learning.vercel.app/。完整结果与已知边界见[正式发布验收](2026-10-21-production-release.md)。下方401和待更新密钥属于此前失败阶段，不代表最终部署。

最新状态（2026-10-21）：用户确认Kimi Code订阅密钥后，已在同一Ego任务页完成Vercel验证。BASE_URL和MODEL分别改为https://api.kimi.com/coding/v1、kimi-for-coding，均返回Updated Environment Variable successfully，范围Production + Preview；其余协议、预算、思考项不变。API_KEY仅由用户填写，未读取值。

真实浏览器验收：新预览[dpl_EhySM543JmXCYkLiCZgoAx5UdofE](https://ai-agent-learning-igif96795-evansong.vercel.app/assessment)已READY，提交b118e2ace7fc770e94b3c5028956910e9c5e2306，target=preview；/assessment展示覆盖12课的前后测与结果对照。进入1-1并通过下一步到自由提问，提交“Agent为什么会忘记前面说过的重要约束”后，页面显示安全错误“AI助教暂时无法回答，请稍后重试”。Vercel网页展开的3条日志显示primary HTTP_403、fallback HTTP_401、AI_UPSTREAM_ERROR；External APIs记录确认备用真实请求api.kimi.com/coding/v1/chat/completions。这证明已走备用接口，不能声称模型可用。

只读核对Kimi控制台的会员/Key状态，没有读取或创建密钥；控制台状态不能证明Vercel Secret的实际内容相同。官方错误文档将401分别列为认证及能力权限问题；未拿到供应商错误正文，不武断断言具体原因，也不将401解释为已确定的编程客户端用途限制。已交还Vercel AI_FALLBACK_API_KEY列表，用户自行核对并更新Preview、Production后再新建预览验收；没有切换正式域名，不反复重试相同凭据。

此前c8cc4a7预览仍502；2119b75增加安全HTTP诊断并通过51项服务端测试。此次只修改Vercel非密钥配置和维护资料，没有业务代码改动或新增测试；此前203单元/51服务端/25 E2E与构建的验证边界分别见原报告，不能称为本轮重跑。

官方依据（2026-10-21）：[Kimi Code接口](https://www.kimi.com/code/docs/en/)、[模型与思考参数](https://www.kimi.com/code/docs/en/kimi-code/models.html)、[401认证与能力权限错误](https://www.kimi.com/code/docs/en/kimi-code/error-reference.html)。保持真实客户端身份。

## 实现与验证

- `server/course-answer.mjs` 读取 AI_FALLBACK_*，缺密钥时不启用。主模型正常或给出有效的资料未覆盖回复时不增加调用；主模型超时、繁忙、连接/响应异常、空答案或引用校验失败后只尝试一次备用。
- 两次尝试分别使用自己的服务端密钥；备用读取同一课审核来源，执行同一引用白名单。用户取消后不尝试备用；失败不暴露供应商错误、密钥或问题原文。
- 有备用时主模型最多20秒，整个请求最多50秒，保留浏览器55秒和Vercel60秒预算。备用默认30秒；取消及超时会取消在途模型请求。
- `npm run test:server`：50项通过；新测试覆盖配置缺密钥/缺字段、主模型成功、合法拒答、503/401/429/断网/坏JSON/空响应/伪造引用、主超时后备用、预取消和在途取消、备用失败无第三次调用。真实本地HTTP测试验证同源问答API完成主备切换与密钥隔离。
- `npm run build` 与 `git diff --check` 通过；本轮仅改变服务端与配置/说明，未重跑原有203单元和25 E2E。

## Vercel 参数

目标：https://vercel.com/evansong/ai-agent-learning/settings/environment-variables 。通过用户指定的ego-browser浏览器操作。

| 变量 | 值 | 类型与范围 |
| --- | --- | --- |
| AI_FALLBACK_BASE_URL | https://api.kimi.com/coding/v1 | Config；Production + Preview |
| AI_FALLBACK_API_STYLE | openai-chat-completions | Config；Production + Preview |
| AI_FALLBACK_MODEL | kimi-for-coding | Config；Production + Preview |
| AI_FALLBACK_TIMEOUT_MS | 30000 | Config；Production + Preview |
| AI_FALLBACK_THINKING | disabled | Config；Production + Preview |
| AI_FALLBACK_API_KEY | 由用户填写 | Secret；Production + Preview |

历史选型：首次按Moonshot开放平台配置kimi-k2.6，参考当时开放平台模型列表；用户后来明确密钥来自Code订阅，已按上表修正Code专用地址/模型。Code密钥不与开放平台接口混用；当前依据见本文开头的Code官方文档。

浏览器已提交5项非密钥Config，页面返回“Added Environment Variable successfully. A new deployment is needed for changes to take effect.”。密钥由用户在预填表单中自行输入，不读取现有主模型或Supabase值，不存储真实密钥。

## 后续验收

当前变量已保存并用于上述新预览；真实问答仍未通过。需用户核对并更新有效Code Key后创建新预览，重新验收问答。通过后再执行正式站发布验收；保持档案v2前后端同批发布与兼容约束。下方原有实现/历史Moonshot选型说明属于此前阶段，不替代本次Code配置与401结果。
