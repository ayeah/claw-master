#!/usr/bin/env node
/**
 * Version manager for Claw Master client.
 * Replaces the legacy `scripts/version_manager.py` (now deleted).
 *
 * Usage:
 *   node scripts/bump-version.js              # bump patch +1 (e.g. 2.3.0 -> 2.3.1)
 *   node scripts/bump-version.js patch        # explicit patch
 *   node scripts/bump-version.js minor        # minor bump
 *   node scripts/bump-version.js major        # major bump
 *   node scripts/bump-version.js build        # patch bump + write build date into VERSION
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const PKG_PATH = path.join(ROOT, 'package.json')
const VERSION_FILE = path.join(ROOT, 'VERSION')

function readPkg() {
  return JSON.parse(fs.readFileSync(PKG_PATH, 'utf-8'))
}

function writePkg(pkg) {
  fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')
}

function bump(version, type) {
  const [major, minor, patch] = version.split('.').map(Number)
  if (type === 'major') return `${major + 1}.0.0`
  if (type === 'minor') return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${(patch || 0) + 1}`
}

function writeVersionFile(version) {
  const today = new Date().toISOString().slice(0, 10)
  fs.writeFileSync(VERSION_FILE, `${version}\n${today}\n`, 'utf-8')
}

function main() {
  const arg = process.argv[2] || 'build'
  const pkg = readPkg()
  const current = pkg.version

  if (arg === 'current') {
    process.stdout.write(`${current}\n`)
    return
  }

  if (!['patch', 'minor', 'major', 'build'].includes(arg)) {
    process.stderr.write(`Unknown argument: ${arg}\n`)
    process.stderr.write('Usage: bump-version.js [patch|minor|major|build|current]\n')
    process.exit(2)
  }

  const type = arg === 'build' ? 'patch' : arg
  const next = bump(current, type)
  pkg.version = next
  writePkg(pkg)
  writeVersionFile(next)

  process.stdout.write(`Bumped ${current} -> ${next}\n`)
}

main()