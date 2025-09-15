#!/usr/bin/env node
import { exec as _exec } from 'node:child_process'
import { promisify } from 'node:util'

const exec = promisify(_exec)

const allowedTop = new Set([
  'package.json',
  'README.md',
  'LICENSE',
  'CHANGELOG.md',
])

function isAllowed(path) {
  // paths reported from npm pack start with 'package/'
  const p = path.startsWith('package/') ? path.slice('package/'.length) : path
  if (allowedTop.has(p)) return true
  if (p.startsWith('dist/')) return true
  if (p.startsWith('bin/')) return true
  return false
}

async function main() {
  const { stdout } = await exec('npm pack --json --dry-run')
  let info
  try {
    info = JSON.parse(stdout)
  } catch {
    console.error('Failed to parse npm pack JSON output')
    process.exit(1)
  }
  const entry = Array.isArray(info) ? info[0] : info
  const files = entry && entry.files ? entry.files : []
  const bad = []
  for (const f of files) {
    const p = f.path || ''
    if (!isAllowed(p)) bad.push(p)
  }
  if (bad.length) {
    console.error('Pack check failed. Disallowed files in package:')
    for (const p of bad) console.error(' -', p)
    process.exit(1)
  }
  console.log('Pack check passed. Only allowed files will be published.')
}

main().catch((e) => { console.error(e?.stack || e?.message || String(e)); process.exit(1) })

