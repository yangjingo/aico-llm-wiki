// 开发期拼接：把 client/src/*.js 按文件名顺序合成 client/client.js。
//
// 为什么要有这一步：宿主的客户端装载契约（window.__ModuleLoader__.load）
// 只吃**单文件**产物，没有 bundler。为了既守住"零构建运行时"的契约、
// 又能把 4000+ 行拆成可维护的组件文件，源码拆在 client/src/，
// 改完源码跑一次 `pnpm run build:client` 合成回 client/client.js。
// 运行时、安装时、宿主侧都不需要任何构建步骤。
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const srcDir = join(root, 'client/src')
const dest = join(root, 'client/client.js')

const files = readdirSync(srcDir).filter((f) => f.endsWith('.js')).sort()
const text = files
  .map((f) => {
    let s = readFileSync(join(srcDir, f), 'utf8')
    if (!s.endsWith('\n')) s += '\n' // 每个组件文件保证以单个换行收尾，拼接后边界干净
    return s
  })
  .join('')
writeFileSync(dest, text)
console.log('built client/client.js from', files.length, 'files:', files.join(', '))
