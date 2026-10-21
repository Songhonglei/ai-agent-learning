# Kimi 备用链路与 Vercel 配置回执

日期：2026-10-21。范围：独立开源课程站，不修改 Cowork。

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
| AI_FALLBACK_BASE_URL | https://api.moonshot.cn/v1 | Config；Production + Preview |
| AI_FALLBACK_API_STYLE | openai-chat-completions | Config；Production + Preview |
| AI_FALLBACK_MODEL | kimi-k2.6 | Config；Production + Preview |
| AI_FALLBACK_TIMEOUT_MS | 30000 | Config；Production + Preview |
| AI_FALLBACK_THINKING | disabled | Config；Production + Preview |
| AI_FALLBACK_API_KEY | 由用户填写 | Secret；Production + Preview |

依据：[Kimi中国站快速开始](https://platform.kimi.com/docs/get-api-key)、[K2.6参数](https://platform.kimi.com/docs/guide/kimi-k2-6-quickstart)、[模型列表](https://platform.kimi.com/docs/models)（2026-10-21读取）。当前模型列表已将kimi-k2.5列为下线，因此配置仍受支持的通用K2.6并关闭思考。不把Kimi Code订阅密钥用于开放平台接口。

浏览器已提交5项非密钥Config，页面返回“Added Environment Variable successfully. A new deployment is needed for changes to take effect.”。密钥由用户在预填表单中自行输入，不读取现有主模型或Supabase值，不存储真实密钥。

## 尚待生效

尚未取得/填写真实Kimi密钥，未调用真实Kimi；没有更改正式部署或点击旧生产部署的Redeploy。需要保存密钥，并部署包含本次备用逻辑的版本，再执行真实问答验收。已有课程测评候选仍未部署，档案v2兼容约束继续有效。
