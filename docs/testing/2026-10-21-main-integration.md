# main 合并与验收回执

日期：2026-10-21（北京时间）。用户要求整理PR，把已验证改动全部合入main。范围仅为Songhonglei/ai-agent-learning开源仓库，Cowork独立项目不变。

## 本轮重新验证

工作区：/Users/songhonglei/space/ai-agent-learning-open-source。

- 验证候选：`dc3659ad9975b0e49eaa4a3c2f424756b37e96a4`。
- 完整文件树：`9a37a53425f0e4f3e04e63d4a2c0ea820995fd5a`。
- 实际执行`npm run verify`，退出0：43个单元测试文件、203项单元测试、50项服务端测试、25项浏览器E2E、TypeScript/Vite构建全部通过；E2E约1.6分钟。
- 本轮覆盖合并后的完整组合，包含主备异常、引用/取消保护、48题测评、JSON恢复、旧档案迁移、跨标签、键盘和响应式等现有测试。真实模型使用本地桩，不读取实际模型凭据，不执行真实Supabase账号写入。

## 合并顺序与结果

| PR | 内容 | 验证/合并关系 | main merge提交 |
| --- | --- | --- | --- |
| [#1](https://github.com/Songhonglei/ai-agent-learning/pull/1) | 独立开源拆分、移动端修复与AI引用/异常保护 | head 5ff1dab；先由draft改为ready并合并main | `0986902e00b2fbe53b11bf301459a66139632d34` |
| [#2](https://github.com/Songhonglei/ai-agent-learning/pull/2) | 全课程前后测、结果对照、schema v2与Kimi备用 | head dc3659a；在#1合并后把base改为main，再ready并合并 | `f8aa8c2b1d6b61204e812a6495dd12218f46d864` |

GitHub确认两个PR均已merged。使用merge提交保留原始历史，合并时固定预期head，未使用强制合并或绕过保护。GitHub没有配置本轮PR测试检查，因此验证依据是本机完整执行记录，不把空检查列表视为CI通过。

拉取远端main后，实际核对其tree等于验证候选的tree，且`git diff dc3659a origin/main`为空。因此合并没有引入新的业务文件差异；不重复运行相同文件树的整套测试。当前main后续只补验收和状态文档，另执行diff检查。

## 分支整理

- 本地main跟踪origin/main，远端默认分支为main，本地origin/HEAD也已指向origin/main。
- 删除本轮已完整进入main的本地及远端分支：`codex/release-hardening-2026-10-21`、`codex/course-assessments-2026-10-21`。删除前分别核对远端head未前进、提交已是main祖先，保留原提交于main历史中。
- 其他本地历史分支不在本轮删除范围；fetch --prune仅清理远端已不存在的陈旧跟踪引用。
- PR说明中的证据链接改用不可变提交路径，避免开发分支删除后失效。

## 尚待发布验收

本轮完成GitHub合并和主分支整理，未手动触发Vercel部署，未核验其自动部署结果。AI_FALLBACK的5项非密钥配置此前已在Vercel保存；本轮未读取密钥，也未核验用户是否已填写/保存AI_FALLBACK_API_KEY。真实Kimi问答、真实账号云端档案链路、目标学员试学和正式域名版本验收仍独立待办，不能从main合并或本地测试成功推导为已完成。

本次没有数据库迁移；发布或回滚仍须保持前端及api/profile的schema v2兼容，见发布清单。
