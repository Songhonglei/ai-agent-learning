# 项目简述（由 stage 10 自动生成，供后续 LLM 改写任务参考）

## 基本信息
- 语言/框架：TypeScript + React / Node.js + Python（PDF 批处理脚本）
- 工程结构：单仓
- 后端入口：server/index.mjs
- 前端目录：src/

## 关键文件索引（后续改写任务直接 Read 这些文件）
- 依赖声明：package.json
- 主入口：src/main.tsx（前端）、server/index.mjs（后端）
- DB 连接/初始化：无
- 文本 AI 调用：server/course-answer.mjs
- 图像 AI 调用：无
- SSO/认证中间件：无
- 环境变量配置：.env.example、config/ai.env

## 技术栈信号（补充 shell 静态扫描可能漏掉的）
- has_db：0（理由：无数据库连接/ORM/迁移相关代码，学习进度仅保存在浏览器 localStorage）
- has_ai：1（理由：has_ai_text=1）
- has_ai_text：1（理由：server/course-answer.mjs 使用 fetch 调用 OpenAI 兼容 /chat/completions 接口）
- has_ai_image：0（理由：无图像生成 SDK 或 /images、ImageSynthesis、generateContent 等调用）
- has_sso：0（理由：无 Decrypted-Userinfo 中间件、req.user、/api/me、useAuth 等身份相关代码）
- has_external_infra：0（理由：无 Redis/MQ/S3/ES 等外部基础设施依赖）

## 图像 AI 调用详情（has_ai_image=1 时必填，否则填"无图像生成调用"）
无图像生成调用

## 改写注意事项（针对本工程的特殊情况）
- Node 后端 server/index.mjs 监听 127.0.0.1 并使用 PORT 环境变量，需改为 0.0.0.0 + APP_PORT 才符合平台要求。
- 文本 AI 调用在 server/course-answer.mjs 中硬编码了模型配置（temperature、system prompt、OpenAI 兼容 messages 格式），改写时需对齐平台 ai.base_url / ai.api_key 与新模型。
- 仓库已提交 config/ai.env（含真实密钥），改写时应移除并改用平台 ai.properties 注入。
- Python 批处理脚本 scripts/source_audit/*.py 依赖 pypdf，但仓库无 requirements.txt/pyproject.toml，部署/改写时需单独声明。
- 项目为单仓库混合结构：Vite React 前端 + Node 后端 + Python 离线脚本，改写时注意区分在线服务入口与一次性脚本。
