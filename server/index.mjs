import { createLearningServer, sendJson } from './app.mjs'
import profile from '../api/profile.mjs'

const profileHandler = async (request, response) => {
  response.status = (status) => { response.statusCode = status; return response }
  response.json = (body) => { response.setHeader('Content-Type', 'application/json; charset=utf-8'); response.end(JSON.stringify(body)); return response }
  if (request.method === 'PUT') {
    let body = ''
    for await (const chunk of request) {
      body += chunk
      if (Buffer.byteLength(body) > 120_000) return sendJson(response, 413, { error: '学习档案内容过大。' })
    }
    request.body = body
  }
  return profile(request, response)
}

const port = Number(process.env.PORT ?? 3000)
createLearningServer({ profileHandler }).listen(port, '127.0.0.1', () => {
  console.log(`开源课程站：http://127.0.0.1:${port}`)
})
