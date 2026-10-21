# Agent Foundations · Open Source

**English** | [简体中文](README.zh-CN.md)

A 12-lesson interactive AI Agent course for non-technical learners, designed to take about 3 hours. Explore how agents work, their limits, and workplace applications through a learning map, scenario exercises, an AI tutor, and course-wide pre- and post-assessments.

**Project highlights (GitHub Pages): [songhonglei.github.io/ai-agent-learning](https://songhonglei.github.io/ai-agent-learning/)**

**Live learning app (Vercel): [my-agent-learning.vercel.app](https://my-agent-learning.vercel.app/)**

The project site presents highlights and product screenshots; the learning app provides the complete course, assessments, and AI tutor.

[Pre-assessment](https://my-agent-learning.vercel.app/assessment/pretest) · [Post-assessment](https://my-agent-learning.vercel.app/assessment/posttest) · [Results comparison](https://my-agent-learning.vercel.app/assessment) · [Source code](https://github.com/Songhonglei/ai-agent-learning) · [Project site (GitHub Pages)](https://songhonglei.github.io/ai-agent-learning/)

## Features

- **12 interactive lessons**: A learning map, scenario exercises, and built-in FAQs, with existing in-lesson exercises and lesson-specific self-checks preserved.
- **Course-wide pre- and post-assessments**: Two 24-question forms covering all 12 lessons, with saved drafts, recovery after refresh, and results locked after the first submission. The post-assessment opens after course completion.
- **Results comparison and review**: Compare total scores, accuracy, six topic areas, and individual lessons, then revisit lessons identified by the post-assessment. Improvement is not calculated without a valid pre-assessment baseline.
- **Source-grounded AI tutor**: Answers are checked against the current lesson's approved source IDs, with timeouts, cancellation, rate limits, and error handling. Configure the primary and fallback models independently using compatible model services.
- **Learning profile and backups**: Store progress, mistakes, bookmarks, and assessment records in the browser, with JSON import/export, cross-tab synchronization, and optional Supabase account synchronization.

Assessments support personal learning review. The question forms have not been statistically calibrated for difficulty and do not constitute certification or evidence of the course's causal effect on learning.

This repository maintains the open-source edition deployed on Vercel. The Cowork edition is a separate local project; there is no build-mode switch between editions. Maintenance references: [Current state](docs/CURRENT-STATE.md) and [OpenViking guide](OPENVIKING.md). This project and the separate custom-course platform have independent knowledge indexes; Cowork is not connected to OpenViking.

## Run locally

Use Node.js 24:

```bash
npm ci
npm run dev
```

The frontend runs at http://localhost:5173. Local learning and built-in FAQs require neither an account nor an AI service. Questions use the same-origin `/api/course-answer` endpoint, proxied to local port 3000 during development. Run `npm run serve:ai` in another terminal to start the backend. Model settings are read only from the Git-ignored `config/ai.env` file or the server environment; do not use `VITE_` variables for model credentials.

Accounts and cloud profiles optionally use Supabase. For development, configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; the backend uses `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. Guest learning with local storage remains available without these settings.

## Verification

```bash
npx playwright install chromium
npm run verify
```

`verify` runs unit tests, server tests, the build, and end-to-end tests in sequence. Tests use local model stubs and do not read real model credentials. To smoke-test a production build, run `APP_PREVIEW_URL=http://127.0.0.1:4175 npm run verify:preview`.

## AI answer safeguards

- Only source IDs from the current lesson's approved source table are accepted. Cross-lesson or fabricated IDs produce a retryable error.
- Out-of-scope refusals and missing citations are handled separately. The model returns an answer status, text, and citations. Only an explicit refusal is shown as a question outside the reviewed material; missing citations or malformed output produce retryable errors without displaying unsupported answer text. Legacy citation formats remain supported, and the server does not invent or automatically fill in sources.
- Each visitor is limited to 12 requests per minute per warm instance and one in-flight question. Each instance accepts up to four concurrent questions.
- The server timeout defaults to 20 seconds, capped at 50 seconds. The browser waits up to 55 seconds and supports cancellation. Timeouts, busy services, network failures, and invalid responses do not prevent use of the lesson FAQ.
- These limits apply within each instance; they are not a deployment-wide quota or spending cap. Use a platform firewall or shared rate limiter if you need centralized usage control.

## Primary and fallback model configuration

The AI tutor is not tied to a particular model or provider. Configure the endpoint, API key, model name, and API style separately for the primary model and the optional fallback. Services must be compatible with the implemented API styles: `openai-chat-completions` and `runway-bedrock`. Other protocols require an adapter.

The fallback is not called when the primary model succeeds. A primary timeout, busy response, connection or upstream error, empty answer, or failed citation check triggers at most one fallback attempt, subject to the same lesson-source checks. User cancellation and valid out-of-scope refusals do not trigger fallback. When a fallback is configured, the primary attempt is capped at 20 seconds and the complete request chain at 50 seconds.

Configure Vercel Production and Preview environments using the variables below. Store API keys as Secrets and the remaining settings as Config values. Do not add a `VITE_` prefix.

| Setting | Primary model | Fallback model |
| --- | --- | --- |
| Endpoint | `AI_BASE_URL` | `AI_FALLBACK_BASE_URL` |
| Server-side API key | `AI_API_KEY` | `AI_FALLBACK_API_KEY` |
| Model name | `AI_MODEL` | `AI_FALLBACK_MODEL` |
| API style | `AI_API_STYLE` | `AI_FALLBACK_API_STYLE` |
| Timeout in milliseconds | `AI_TIMEOUT_MS`, default `20000` | `AI_FALLBACK_TIMEOUT_MS`, default `30000` |

Copy the [configuration example](config/ai.env.example) and replace the placeholder endpoints, keys, and model names with your own settings. For OpenAI-compatible services, explicitly set both API styles to `openai-chat-completions`. The primary and fallback may use different services; check each service's API compatibility, model permissions, and supported parameters.

`AI_FALLBACK_THINKING` is optional. Set it to `enabled` or `disabled` only if the fallback service supports `thinking.type` and uses `openai-chat-completions`. Otherwise, leave it empty so that the field is omitted from requests.

Without a fallback key, only the primary configuration is used. A complete fallback configuration can also run on its own when no primary is configured. Model configuration stays on the server and is not embedded in frontend code. Redeploy after updating environment variables for the new values to take effect.

## Deployment and data boundaries

The Vercel project is `ai-agent-learning`, and its production domain is `my-agent-learning.vercel.app`. Build with `npm run build` and use `dist` as the output directory. The `api/` directory provides course-answer and Supabase profile endpoints. Deployment procedures and acceptance records are in `docs/release/`.

This repository does not include Cowork SSO, enterprise PostgreSQL services, platform installation scripts, original PDFs, enterprise configuration, or credentials. Public pages show reviewed source notes. Deployers with reference documents they are entitled to publish may configure `VITE_SOURCE_DOCUMENT_URL`. Learning data stays in the current browser by default; signed-in users may choose to synchronize it.

Original books and illustrations are not distributed with this repository and remain the property of their respective rights holders. Course code is licensed under the MIT License.

See `docs/PROJECT-BOUNDARY.md` for the independent evolution of the two editions and `docs/CURRENT-STATE.md` for actual progress. Course-wide pre-assessment, post-assessment, and results comparison cover all 12 lessons; existing in-lesson exercises and lesson 1-1 self-checks are preserved.

## Course-wide assessments

Choose the pre-assessment action on the learning map or open `/assessment/pretest`. Each assessment has 24 questions, two per lesson, using different scenarios. Answers and explanations are hidden until submission. Learners can pause, skip questions, revise answers, and resume after a refresh. The first submitted result is locked. After completing all 12 lessons, open `/assessment/posttest` from the course-completion entry. A pre-assessment is not required to take the post-assessment.

`/assessment` and the learning profile show total scores, accuracy, comparisons across six topics and individual lessons, and lessons to review after the post-assessment. A pre-assessment submitted after learning activity is marked as a late baseline. No improvement is calculated when the baseline is missing, late, or recorded in the wrong order. The two forms have not been statistically calibrated for difficulty; use the results for personal review, not certification or causal claims about course effectiveness.

Profile schema v2 automatically reads and migrates v1 data, preserving lesson exercises, bookmarks, mistakes, and the original lesson 1-1 self-checks. Assessment drafts and results are included in JSON backups, cross-tab synchronization, and optional cloud profiles. Imports prefer the earlier first-submission result. Deploy the frontend and `/api/profile` at the same version: older client writes receive HTTP 409 to prevent overwriting new assessment data. This upgrade requires no database migration. See the [assessment rules](docs/COURSE-ASSESSMENT.md) and [verification report](docs/testing/2026-10-21-course-assessment.md).
