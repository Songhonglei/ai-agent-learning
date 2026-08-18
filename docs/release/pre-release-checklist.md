# 发布前准备与本机验证

> 本文件只定义本地发布前准备；不构成远程发布授权。

## 当前候选基线

- 分支：本地 `main`
- 本地验收：阶段0至阶段4（本地范围）已完成，证据见 `docs/superpowers/evidence/`
- 服务边界：React 前端可静态托管；自由提问启用后需 Node/Serverless 服务端代理，不接前端密钥或远程学习档案写入
- 发布状态：未推送、未部署、未发布

## 发布前检查单

- [x] 在候选工作树上运行 `npm run test:run`（29 文件 / 136 项通过）
- [x] 运行 `npm run test:e2e`（12 项通过）与 `npm run build`，保留 `dist/` 作为待发布静态构建物
- [x] 使用 `npm run preview -- --host 127.0.0.1 --port 4173` 验证生产构建物
- [x] 运行 `npm run verify:preview`，确认首页、课程直达路由与浏览器控制台正常
- [x] 复核 12 课来源包、版权边界和本地 FAQ；确认无真实模型或网络依赖
- [x] 运行 `git diff --check`
- [ ] 记录候选提交、构建时间、构建物校验值和测试结果
- [ ] 取得远程发布授权后，才可选择发布目标并上传构建物

## 本机验证方案

优先验证 `vite preview`，而非开发服务器：它实际提供 `dist/` 目录，最接近未来静态托管结果。

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
# 在另一终端执行：
npm run verify:preview
```

默认仅监听 `127.0.0.1`，不向局域网暴露服务。自动化验证会检查页面标题、学习地图、0-1 路由及浏览器控制台错误；完整课程与断点回归继续由 `npm run test:e2e` 覆盖。

## 线上回滚原则（待发布授权后执行）

1. 发布前保留当前线上构建物、版本标识和访问地址，作为可恢复版本。
2. 新构建物以候选提交和校验值登记；出现 P0/P1、无法学习或档案恢复风险时停止发布。
3. 发布后发现阻断问题时，优先将静态托管指向上一份已验证构建物；不修改用户浏览器内的 localStorage。
4. 回滚后保存故障时间、受影响版本、恢复版本和复验结果，再决定是否重新发布。

具体托管平台、线上地址、负责人及切换操作必须在获得发布授权后补全，不能在本地准备阶段假设或执行。

## AI 自由提问服务（待配置）

自由提问改为服务器端调用 Runway Bedrock InvokeModel：浏览器仅向 `/api/course-answer` 发送课程编号与问题，服务器读取对应课程的审核来源包后调用模型。API Key 只能放入服务器 `ai.properties`，不能使用 `VITE_` 前缀，不能提交到仓库。

```bash
# 在项目根目录或 server/ 目录创建 ai.properties，填入：
# ai.base_url=https://runway.devops.rednote.life/openai
# ai.api_key=<Runway 平台申请的 API Key>
npm run build
npm run serve:ai
```

`ai.base_url` 应为 Runway 网关根地址（已含 `/openai`），服务端会调用其 `/bedrock_runtime/model/invoke`。启用该能力后，部署目标必须支持 Node 服务或等价 Serverless Function；纯静态托管不能安全提供该接口。

## 静态托管必备配置

应用使用浏览器路由；未来托管平台必须把未知应用路径（例如 `/lesson/0-1` 与 `/profile`）重写到 `index.html`，再由前端路由渲染页面。发布前必须在候选线上环境直接打开至少一个课程深链，不能只验证从首页点击进入。
