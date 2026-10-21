# 拒答与漏引用区分优化

日期：2026-10-21。范围：开源课程站；按用户“代价不高直接更新”的要求实施。

## 代价与行为

- 两个服务端模块和三个测试文件；没有前端、依赖、数据库、课程题库、账号或模型凭据变更。客户端仍接收answer/citations，不迁移学习档案。
- 正常回答不增加调用次数；漏引用或格式错误只沿用既有一次备用，不新增修复重试。主最多20秒、备用配置预算和整链50秒不变。提示词及JSON字段有少量文本开销，未作模型计费估算。
- 原逻辑把所有无引用正文都显示为“资料未覆盖”，会掩盖输出错误；提示词还给全部课程复用page-035/figure-2-1示例。
- 现在要求模型输出JSON对象：status（answered或out_of_scope）、answer、citations。服务端验证类型、明确拒答和引用；可回答但漏引用返回AI_SOURCE_MISSING，坏结构返回AI_RESPONSE_INVALID。前端显示可重试提示，不把无依据正文当作课程答案。
- 只接受模型实际给出的本课白名单ID；不从审核表自动补齐引用。仍拦截虚构、跨课和格式错误；保留原标签/行内引用兼容，合法行内编号可回收到引用列表。提示词只列当前课允许ID，示例随课程变化。

## 验证

- 最终c3cbea260f1deaec8d49bf3d62223854b2211133：59项服务端测试通过，涵盖4-2原问法、本课提示词、JSON/旧格式、明确拒答、漏引用、坏结构、伪造/跨课、取消、时限及最多一次备用。
- 本地真实HTTP与Ego浏览器（4184，无真实模型/凭据）：漏引用只显示“未提供可核验的课程来源”；明确拒答显示资料未覆盖；再提问能恢复带page-312的回答。临时服务已停止，既有4182预览保留。
- 首个c17b7e0候选的真实4-2复验仍出现漏引用，但正确显示AI_SOURCE_MISSING；保留此结果，未视作回答质量通过。随后改为明确JSON协议，并兼容旧输出格式。
- JSON候选Preview dpl_DHwJwqTAgkHZQWxtEsMqthi5w9g3，https://ai-agent-learning-baa59wh64-evansong.vercel.app/lesson/4-2 ，READY。原问法“什么时候多个 Agent 的协作更有价值？请用本课资料简短解释并给出引用。”实际UI回答成功，引用outline-280-258、page-280、page-312；火星酒店价格问题HTTP200安全拒答、空引用。
- PR #3：https://github.com/Songhonglei/ai-agent-learning/pull/3 ，已merge为5fd6a03ea9f3a7dcab7cd021960d6f122605021a。main完整Git tree与已验证c3cbea2候选一致。
- 无前端改动，不重复跑已有203单元与25 E2E；本轮实际运行59项服务端测试与针对性浏览器检查，Vercel构建READY验证构建入口。

## 边界

结构协议能区分模型声明的拒答与缺来源错误，不替代语义审核；模型仍可能误判课程覆盖范围。合法引用编号不代表每句结论都已人工核验。此次不引入关键词覆盖分类、向量服务或额外推理循环，不声称完全消除所有误拒答。


## 正式上线结果

- Production 5fd6a03 / dpl_jDquErNeX6pfhKtoZYKAvsYRDNxF，https://ai-agent-learning-8ov8mv0z2-evansong.vercel.app/ ，READY；生产配置下原问法HTTP200并引用outline-280-258、page-280、page-312。
- 创建Production部署后Vercel自动将其设为current，早于计划中的手动提升。随后核对正式域名已指向jDqu，request_promote返回409 already current；没有重复提升。不能把本轮描述为完全暂存后手动上线。
- 重新读取Production设置，Auto-assign为Enabled；已通过project update恢复已知原始值false，网页刷新明确显示Production deployments will need to be manually promoted。恢复不影响当前正式域名，部署保护未改变。先前promote后不能假定该开关仍Disabled，后续每次创建Production前需重新核对。
- https://my-agent-learning.vercel.app/lesson/4-2 真实UI复验原问法通过，同样显示上述三项合法引用；火星酒店问题200、固定拒答、空引用。/assessment与课程深链均200。
- Vercel当前部署筛选日志中，本轮三次/api/course-answer请求均200；该时间窗显示Warning/Error/Fatal计数均0。此结果限于本轮请求，不推断长期可用率。
- 正式站保持档案v2兼容；未修改SQL、账号或学习记录。前次兼容v2的HUP部署保留为恢复点，不回滚至旧v1。
- 已查看正式回答截图：[4-2引用优化](2026-10-21-citation-clarity-live.png)。这只是本轮具体问法的实测，不是所有问法或所有模型版本的语义准确率保证。
