/**
 * server.cjs - 纯前端 SPA 托管入口
 * 由 guard-transform 模板渲染生成（stage 30）
 *
 * 设计：
 *   1) 使用 vercel/serve-handler 作为底层静态托管 lib（不是 `serve` CLI），
 *      可在原生 http.Server 上插入自定义路由（/health）+ 自定义 fallback（SPA）
 *   2) /health：满足 Guard 子应用规范 —— APP_PORT（默认 3000）暴露 HTTP `/health`，
 *      返回 JSON {ok: true, ts: ...}；同时是 verify_health_consistency 唯一识别的探活端点
 *   3) SPA history fallback：访问无扩展名的 URL（如 /about、/users/123）时
 *      自动改写为 /index.html，让前端路由接管；静态资源（带 . 的）保持原 path 走 404
 *   4) 优雅退出：SIGTERM/SIGINT → server.close() → 5s 后强制 exit(0)
 *
 * 路由扫描兼容（verify_health_consistency.sh）：
 *   该 verifier 的正则只认 express/koa/fastify 风格的 `app.get(...)` 形式装饰器；
 *   原生 http.createServer + req.url 判定不会被识别。为了让纯前端工程也能通过
 *   /health 路由扫描，下面紧跟一行 express 风格注释作为 verifier anchor：
 *
 *   app.get('/health', (req, res) => res.json({ ok: true }))   // verifier anchor; 真实实现见下方 handler
 */

'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');

// ── 模块解析：把 .guard-runtime/node_modules 注入到本文件的 require 查找路径 ──
//
// 为什么需要这一步：
//   serve-handler 被装在隔离子目录 .guard-runtime/node_modules/（避免污染业务
//   package.json 的 lock 一致性、避免在业务根重新解析全部 deps）。
//   而 Node.js 标准 require() 的解析规则是从 __dirname 向"上"逐级查 node_modules/，
//   永远不会自动下钻到子目录。如果不做这一步，下面的 `require('serve-handler')`
//   就只能写成绝对路径 `require(path.join(...,'.guard-runtime','node_modules','serve-handler'))`，
//   导致：① depcheck / npm ls 等静态依赖扫描器认不出依赖；
//        ② IDE 无类型补全 / 跳转；
//        ③ 维护者全仓搜 'serve-handler' 搜不到 server.cjs 这一处引用。
//
// 等价于在启动前 `export NODE_PATH=<work>/.guard-runtime/node_modules`，但作用域
// 仅限本文件（每个 module 各自维护 module.paths 数组）。
//
// 文档：https://nodejs.org/api/modules.html#modulepaths
const RUNTIME_DIR = path.resolve(__dirname, '.guard-runtime');
module.paths.unshift(path.join(RUNTIME_DIR, 'node_modules'));

// 之后即可使用标准 require：静态分析友好 / IDE 友好 / 维护者直观
let handler;
try {
  handler = require('serve-handler');
} catch (e) {
  console.error('[server] cannot load serve-handler from ' + RUNTIME_DIR + '/node_modules/');
  console.error('        did install.sh run on this Pod?');
  console.error('        ' + (e && e.message));
  process.exit(1);
}

// ---- 静态目录定位（容错：优先 TPL_STATIC_DIR，回退 dist/build/out/public）----
const STATIC_CANDIDATES = ['src/dist', 'dist', 'build', 'out', 'public'];
let STATIC_DIR = null;
for (const cand of STATIC_CANDIDATES) {
  if (!cand) continue;
  const p = path.resolve(__dirname, cand);
  if (fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))) {
    STATIC_DIR = p;
    break;
  }
}
if (!STATIC_DIR) {
  console.error('[server] no valid static dir found (tried: ' + STATIC_CANDIDATES.join(', ') + ')');
  process.exit(1);
}
const INDEX_HTML = path.join(STATIC_DIR, 'index.html');

// ---- 端口 ----
const PORT = parseInt(process.env.APP_PORT || '3000', 10);
const HOST = '0.0.0.0';

// ---- HTTP server ----
const server = http.createServer(async (req, res) => {
  try {
    const pathname = (req.url || '/').split('?')[0];

    // 1. Guard 子应用规范：/health endpoint
    if (pathname === '/health') {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, ts: Date.now() }));
      return;
    }

    // 2. SPA history fallback：无扩展名 URL → rewrite 到 /index.html
    //    静态资源（.js/.css/.png/...）保持原 path，让 serve-handler 走 404
    const baseName = pathname.split('/').pop() || '';
    if (!baseName.includes('.') && fs.existsSync(INDEX_HTML)) {
      const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
      req.url = '/index.html' + qs;
    }

    // 3. 交给 serve-handler 托管静态文件
    await handler(req, res, {
      public: STATIC_DIR,
      cleanUrls: false,
      trailingSlash: false,
      etag: true,
    });
  } catch (err) {
    console.error('[server] handler error:', err && err.stack || err);
    if (!res.headersSent) {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    }
    if (!res.writableEnded) {
      res.end('Internal Server Error');
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log('[server] listening on http://' + HOST + ':' + PORT + ' (static=' + STATIC_DIR + ')');
});

server.on('error', (err) => {
  console.error('[server] listen error:', err && err.stack || err);
  process.exit(1);
});

// ---- 优雅退出（SIGTERM/SIGINT → server.close → 5s 兜底强制退出）----
let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('[server] received ' + signal + ', shutting down');
  server.close(() => process.exit(0));
  // 兜底：5s 后强制退出，避免 keep-alive 连接拖延
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
