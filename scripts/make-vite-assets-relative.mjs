import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const indexPath = resolve('dist/index.html')
const html = await readFile(indexPath, 'utf8')
const relativeHtml = html
  .replaceAll('src="/assets/', 'src="./assets/')
  .replaceAll('href="/assets/', 'href="./assets/')

await writeFile(indexPath, relativeHtml)
