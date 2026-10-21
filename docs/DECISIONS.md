# 开源项目决策

## 2026-10-21：独立的全课程测评

用户要求覆盖12课的课程前测、结课后测和结果对照，并保留课内练习；本轮仅实现开源版，Cowork独立演进。前后卷各24题、每课2题、不同情境；首次提交锁定，不提前显示反馈；后测要求12课完成记录。补测与无基线明确区分，不计算不成立的提升。

schema v2显式区分全课程测评与旧单课结果；兼容读取v1并迁移，旧写请求拒绝。前后端作为同一候选发布，不直接回退到会丢字段的v1服务。具体规则见 COURSE-ASSESSMENT.md。

## 2026-10-21：模型状态与后续意向

用户确认阿里云模型暂不可用，需要晚些生效，另计划提供Kimi模型作fallback。此为用户告知的状态和后续意向，本轮未取得Kimi配置，未实现或宣称fallback已启用；测评不依赖模型。

## 2026-10-21后续：Kimi与独立知识映射

Kimi一次备用逻辑已通过测试并随PR #2合入main，5项非密钥配置此前保存在Vercel。用户现确认Kimi API Key已保存；浏览器仅确认Production/Preview两条Secret存在，不读取值。真实调用和正式站验收仍需执行，不从配置存在推导为调用成功。

用户明确要求OpenViking分别映射ai-agent-learning-open-source与custom-course-platform；ai-agent-learning-cowork基本完成，本轮不接入。复用既有全局MCP、服务和共享local-development身份，各自使用独立code、scope和白名单；旧课程资料索引保留历史。此维护知识不接入网站问答链路，不自动新增定时任务。


## 2026-10-21：本地目录缩短为ai-agent-learning-open

按用户指令，将/Users/songhonglei/space/ai-agent-learning-open-source原位更名为/Users/songhonglei/space/ai-agent-learning-open；只改变本地目录与注册工作区路径，OpenViking project_code/scope沿用ai-agent-learning-open-source，GitHub仓库、Vercel项目及正式域名保持原值。没有保留旧路径软链接或复制出另一套项目。


## 2026-10-21：按已确认的Kimi Code凭据对齐接口

用户明确密钥来自Kimi Code订阅，并在同一Ego任务页完成Vercel验证。非密钥配置已保存为https://api.kimi.com/coding/v1、kimi-for-coding，适用于Production与Preview；密钥继续由用户自行维护。新预览真实问答备用返回401，正式站不据此发布；先核对Code凭据，再新部署验收。保持客户端真实身份，不通过伪装工具标识解决供应商权限问题。


## 2026-10-21：仓库入口明确指向Vercel正式课程站

用户要求GitHub仓库描述反映新增功能，README显式标注Vercel站点。About描述增加全课程前后测/结果对照、引用AI助教及Kimi备用，homepage设为https://my-agent-learning.vercel.app/；README顶部展示同一在线体验地址和测评直达链接。原GitHub Pages链接作为项目介绍保留，不再作为About主站地址。


## 2026-10-21：低代价区分模型漏引与明确拒答

用户要求代价不高则直接更新，采用两个服务端模块、无前端/依赖/数据迁移的方案：JSON回答状态/正文/引用，兼容原格式；缺来源/坏格式使用明确错误并沿用一次备用，不引入额外推理重试、关键词范围分类或新检索服务，不从白名单自动填引用。59项服务端测试及原4-2问法真实Preview/Production/正式站通过，PR #3合入main并上线。模型语义范围判断不作为确定性保证。
