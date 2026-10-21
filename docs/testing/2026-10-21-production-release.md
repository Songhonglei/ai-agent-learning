# Vercel 正式发布验收

日期：2026-10-21。范围：开源课程站；Cowork与课坊未发布或同步。

## 发布结果

- 正式站：https://my-agent-learning.vercel.app/；测评：https://my-agent-learning.vercel.app/assessment 。
- 发布提交：36004106c20fc331b0f520d02d1403f5e162d7f0；本轮发布没有新增业务代码，沿用已验证的main。提交标题中的“authentication failure”是上一阶段记录，不能据此判断本部署仍失败。
- Preview：dpl_8i5fnUEnn2A2G7xqW5UXCFB4GRQC，https://ai-agent-learning-8egukyzs6-evansong.vercel.app/ ，READY。
- Production：dpl_HUPzHez4E72JtRSfLmxo4zfmn6ZS，https://ai-agent-learning-97d7ahwsb-evansong.vercel.app/ ，READY；先使用Production变量暂存验证，再通过request_promote提升。
- 项目原有Auto-assign Custom Production Domains为Disabled，本轮保持该设置；创建生产部署后先核对正式域名仍为旧Fg部署，完成验收后才提升。提升回执my-agent-learning.vercel.app alias=completed，域名解析到上述HUP部署。没有修改部署保护或复制密钥到本机。

## 真实浏览器与接口检查

1. 用户重新保存Preview和Production的Code密钥后，新建Preview3600410。1-1通过下一步进入自由提问，真实回答解释上下文限制并显示figure-2-1、page-035；4-2跨课提问HTTP200，引用outline-280-258、page-280、page-312，内容与对应审核表一致。
2. 超出课程资料的火星酒店价格问题HTTP200，安全返回资料未覆盖且citations为空。
3. Preview的Vercel请求详情列出阿里云与api.kimi.com/coding/v1/chat/completions两个External APIs，问答响应200；仅凭没有warning不能断言没有走备用，主模型还可能在HTTP200中返回供应商错误载荷。
4. Production暂存实际问答200且带figure-2-1、page-035。日志明确primary HTTP_403、对外200，确认备用接替成功。访客/api/profile=401；非法课程/api/course-answer=400 INVALID_QUESTION，均为预期拦截。
5. Production暂存前测开始后选一题，刷新保留“第1题，已答”和选中项，提交前不显示反馈；仅在独立暂存origin写入合成测试草稿，不覆盖正式域名的学习记录。
6. 提升后正式域名/、/assessment、/assessment/posttest、/lesson/4-2及JS/CSS资源均200。正式浏览器/assessment展示12课、每次24题和结果对照；1-1真实UI回答和审核引用成功。
7. 390×844移动端检查scrollWidth=390、无横向溢出，前测与后测链接存在；桌面及移动截图已查看。
8. 正式4-2的一次相关提问返回“资料未覆盖”安全降级、无引用，未当成正常有依据回答。Preview同课问答成功；这是一次问法/模型引用输出的质量待优化项，不能将所有200等同于内容质量通过。保留该结果，不重复提问凑成功率。
9. 发布后该部署日志有3条已执行真实问答200及预期的访客401、非法课程400；Warning为主模型HTTP403，Error/Fatal=0，当前窗口未见对外5xx。此为本轮有限流量核对，不是长期可用率保证；日志MCP仍无权限，使用已登录Vercel网页检查。

## 验证边界

- 历史组合dc3659a已有203单元、50服务端、25 E2E与构建通过；2119b75新增安全诊断后51服务端通过。后续提交只有维护资料，未重复运行同一业务文件树的全量测试；本轮Vercel两环境构建READY并执行上述真实浏览器/接口验收。
- 密钥只由用户在Vercel保存，未读取、输出、打包或提交密钥。本轮无SQL迁移、seed、真实Supabase账号写入或生产数据恢复操作。真实账号云端同步尚未新验收。
- 浏览器代查不能替代目标学习者试学。约3小时仍是用户确认的预期，未采集真人耗时或前后测效果。
- 限流仍为单实例内存保护；模型合法来源编号不等于语义逐句人工审核。备用可用，主阿里云权限/配置故障仍待其维护者处理。
- 新稳定版本使用档案v2，后续回滚优先保持v2读写兼容；不能直接切回旧v1接口/客户端丢失全课程测评字段。本次HUP生产部署可作为后续同兼容版本发布的恢复基线。

## 截图

- [正式测评页](2026-10-21-production-assessment.png)
- [正式真实回答](2026-10-21-production-answer.png)
- [390px测评页](2026-10-21-production-assessment-mobile.png)
