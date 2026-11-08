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

| 事件 | 准确回执 |
| --- | --- |
| 维护提交 | `426a806887fb0f64bee28e7879f7bec02626b85a`，已推送维护分支 |
| PR #4 | [已合并](https://github.com/Songhonglei/ai-agent-learning/pull/4)，merge `eefbe9e5ad8d0a346f8ec590d5c3e42f11211327` |
| PR #4 CI | [42457548718](https://github.com/Songhonglei/ai-agent-learning/actions/runs/42457548718) success，219单元、64服务端、构建、审计0项、25 E2E通过 |
| 首次main CI | [42457775294](https://github.com/Songhonglei/ai-agent-learning/actions/runs/42457775294) failure；48次导航用例30秒总时限到期后出现session closed，其余24项E2E通过；保留该失败，不将其写为全绿 |
| CI预算修正 | [PR #5](https://github.com/Songhonglei/ai-agent-learning/pull/5)，提交`b5e798c03fc26de9536ba9c0209c0f1b66654bc3`，merge `0e9a8a781f15f4b1b65d6488c2b4134dae635326` |
| 修正后CI | [PR运行42458059749](https://github.com/Songhonglei/ai-agent-learning/actions/runs/42458059749)与[main运行42458273111](https://github.com/Songhonglei/ai-agent-learning/actions/runs/42458273111)均success；保留全部25项E2E，仅长用例预算90秒、CI并发2，无自动重试 |
| Preview | `dpl_4oQvih6kMFfEbVSU46Vy8QY2wFX8` READY，https://ai-agent-learning-fcqrvfgge-evansong.vercel.app ，gitSource准确指向`eefbe9e`；与最终版本业务代码/依赖/部署配置相同 |
| Production | `dpl_4jrnHHi3RcCGXzvrLNE7EwipUvrN` READY，https://ai-agent-learning-c7n7on5n5-evansong.vercel.app ，CLI metadata源码`0e9a8a7` |
| 正式域名 | https://my-agent-learning.vercel.app/ ，alias独立读回指向上述Production ID，CLI outcome为promoted |

生产从干净的main `0e9a8a7`使用官方Vercel CLI65.12.1、明确project ID/team、`--prod --skip-domain`暂存。暂存READY后确认正式alias仍为旧部署，再使用ego验收同一Production构建；主分支CI成功后提升同一构建，无重建。提升后autoAssignCustomDomains仍为false，未改部署保护、模型/Supabase凭据或SQL。

连接器未列出项目，已登录网页可正常读取；网页直接创建请求返回challenge_required，未生成部署。官方CLI使用本机既有有效凭据，project inspect确认同一项目后按支持的API/部署流程发布；未提取浏览器认证信息、未伪装客户端或更改访问保护。没有将项目连接Git或创建新项目。

## 线上验收与具体边界

- Preview：测评入口可用，选择后刷新恢复；匿名档案401、非法课程400；真实1-1问题200，引用figure-2-1/page-035。
- Production暂存：从1-1课程步骤进入自由提问，真实UI展示正常回答及figure-2-1/page-035；这是Production配置下同一最终构建的实测，不是将Preview配置结果外推。
- 正式域名：测评页与加载的JS资源200，4-2课程深链可用，390px无横向溢出；匿名档案401、非法课程400。正式域名只读复核，不清除用户存储或提交真实账号学习数据。
- Supabase外部服务探针出现TLS握手超时，浏览器直接请求也失败。旧正式站无效凭据请求返回500，新部署对应请求返回安全JSON 503；日志为固定`profile-api: SERVICE_UNAVAILABLE`，未泄露上游正文。这证明异常保护生效，不证明云服务已恢复。具体外部根因未定，真实登录/账号读写/RLS仍未通过独立验收。
- 该Production最近20分钟error级运行日志查询返回0条、无排除时段；完整运行日志包含故意档案故障探针的warn，以及primary HTTP_403。真实问答对外200且带引用，备用接替主模型；不宣称不存在任何5xx或所有问题均能正确回答。
- 浏览器为单一ego任务空间43；Vercel、Preview、Production和正式站复核均使用该空间。Ego提示可更新，本轮不升级。

没有执行真实Supabase账号写入/数据迁移、修改模型/数据库凭据或自动双向同步其他课程项目。发布后应优先核对/恢复Supabase外部可达性，再单独验证真实账号、RLS和双设备冲突；本轮不将该后续任务写成完成。

## 恢复与回执

旧生产`dpl_jDquErNeX6pfhKtoZYKAvsYRDNxF`保留，属于schema v2恢复点；其并发保护和外部错误处理弱于新实现。出现严重回归时优先发布保持v2与条件写入的修复，不将旧无条件覆盖接口称作等价并发保护回退方案。不得清空学员localStorage或云档案配合回滚。

本地main后续仅补本文和维护文档，已上线运行代码仍为`0e9a8a7`；文档回执提交不会触发Vercel自动发布（项目未连接Git）。OpenViking当前克隆未登记别名，沿用本地文档回退，不向另一个工作区同步。
