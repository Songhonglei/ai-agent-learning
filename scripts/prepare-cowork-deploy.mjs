import { execFile } from 'node:child_process'
import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { promisify } from 'node:util'

const projectRoot = resolve(import.meta.dirname, '..')
const artifactRoot = resolve(projectRoot, '.artifacts', 'cowork')
const run = promisify(execFile)

async function copyRequired(source, destination) {
  const target = resolve(artifactRoot, destination ?? source)
  await mkdir(dirname(target), { recursive: true })
  await cp(resolve(projectRoot, source), target, {
    recursive: true,
  })
}

async function copyOptionalFile(source, destination) {
  if (!source) return false
  try {
    if (!(await stat(source)).isFile()) return false
    await mkdir(dirname(resolve(artifactRoot, destination)), { recursive: true })
    await cp(source, resolve(artifactRoot, destination))
    return true
  } catch {
    return false
  }
}

await rm(artifactRoot, { recursive: true, force: true })
await mkdir(artifactRoot, { recursive: true })

for (const path of ['dist', 'reference/source-audit']) {
  await copyRequired(path)
}
for (const path of [
  'server/course-answer.mjs',
  'server/db.mjs',
  'server/index.mjs',
  'server/init_db.mjs',
  'server/profile.mjs',
]) {
  await copyRequired(path)
}
for (const path of ['health.sh', 'install.sh', 'start.sh', 'init_db.js']) {
  await copyRequired(path)
}
await copyRequired('deploy/cowork/package.json', 'package.json')
await copyRequired('deploy/cowork/package-lock.json', 'package-lock.json')
await copyRequired('deploy/cowork/.npmrc', '.npmrc')

const bundledPdf = resolve(projectRoot, 'reference', '原始文档.pdf')
const externalPdf = process.env.COURSE_SOURCE_PDF
const hasPdf = await copyOptionalFile(bundledPdf, 'reference/原始文档.pdf')
  || await copyOptionalFile(externalPdf, 'reference/原始文档.pdf')

const sourcePackage = JSON.parse(await readFile(resolve(projectRoot, 'package.json'), 'utf8'))
const { stdout: sourceCommit } = await run('git', ['rev-parse', 'HEAD'], { cwd: projectRoot })
await writeFile(resolve(artifactRoot, 'BUILD_INFO.json'), `${JSON.stringify({
  deploymentTarget: 'cowork',
  sourcePackage: sourcePackage.name,
  sourceVersion: sourcePackage.version,
  sourceCommit: sourceCommit.trim(),
  sourcePdfIncluded: hasPdf,
  generatedAt: new Date().toISOString(),
}, null, 2)}\n`)

console.log(`Cowork staging ready: ${artifactRoot}`)
console.log(`Source PDF included: ${hasPdf ? 'yes' : 'no'}`)
