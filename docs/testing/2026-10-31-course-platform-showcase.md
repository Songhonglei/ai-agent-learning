# 课坊平台介绍页 · 2026-10-31

用户指定在现有`Songhonglei/ai-agent-learning`仓库新增`coursePlatform`，介绍课程来源、企业课程平台功能、定制能力和授权方式；不另建仓库，不公开平台业务源码。

## 发布内容

- `coursePlatform/README.md`：课程来自课坊（custom-course-platform）、核心功能、企业定制与未开源说明，作者主页及使用咨询入口。
- `coursePlatform/index.html`：纸色／墨绿／陶土色，章节式产品介绍，四张演示截图，定制能力与授权联系区。沿用课坊学习平台视觉，DFII为14；字体Noto Serif SC／Noto Sans SC，锚点平滑滚动支持减少动效偏好。
- `coursePlatform/assets/`：独立样式和工作台、阅读器、额度、保留策略四张WebP。截图为真实组件与虚构数据，不含企业实际资料、账号或用量。
- 英中README增加平台介绍入口；原Pages首页增加课程来源与平台入口。原课程站运行代码、依赖、服务端和模型配置保持。
- Pages仍使用同一个站点，原`site/`作为根页面，产品页发布到`/ai-agent-learning/coursePlatform/`。workflow显式复制平台HTML、样式和四图，不将该目录README或其他平台资料打入站点。

## 公开边界

这里只有产品介绍和演示截图。课坊平台本身尚未开源；企业用户和团队可联系作者Evan Song申请使用授权及定制。本仓库课程代码的MIT License不意味着平台源码也已开源。

本轮不发送咨询、不修改学习账号／数据，不调用真实模型、邮件或企业服务，不发布Vercel应用。GitHub与Pages最终回执在验收后补充。


## 本机验收

产品页1440／1024／768／390／320五宽度无横向溢出，六类定制能力与未开源说明可见，图片四张加载／替代文字／源文件字节一致，页面不含私有管理员或私库源码链接。实际coursePlatform目录前缀、授权锚点、原Pages首页入口跳转通过；原页新增介绍的英中切换与1440／390／320三宽度通过。Markdown／图片相对链接与diff检查通过。这是静态页面的桌面浏览器响应式检查，不是移动真机或平台业务验收。


## 发布回执

展示源码`3a58f820021de384e54e04268b765bbe23c757ed`已推送main；[Pages运行41187655900](https://github.com/Songhonglei/ai-agent-learning/actions/runs/41187655900)成功，原站与产品子页同一包发布。公开地址：https://songhonglei.github.io/ai-agent-learning/coursePlatform/ 。GitHub原文7个coursePlatform文件与本机blob一致；部署来源和状态独立读回。公开HTML已读回与本机一致，首次后续CSS读取遇到连接重置，未将中断称作全资源通过；浏览器随后由用户接管，线上视觉操作按工具规则暂停，本机五宽度及根页英中／入口验证保持有效。

公开变更只含展示目录、英中README、原Pages入口、发布组装及维护资料，没有React学习App、API、依赖、模型值或平台源码。
