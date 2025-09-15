#!/usr/bin/env node
import { spawn } from 'node:child_process'

const major = Number(process.versions.node.split('.')[0])
const args = ['--test']
if (major >= 20) args.push('--test-timeout=20000')

const child = spawn(process.execPath, args, { stdio: 'inherit' })
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 1)
})

