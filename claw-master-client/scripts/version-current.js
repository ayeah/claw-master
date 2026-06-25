#!/usr/bin/env node
/**
 * Print current Claw Master client version.
 * Replacement for the legacy `python ../scripts/version_manager.py current`.
 */

const fs = require('fs')
const path = require('path')

const PKG_PATH = path.resolve(__dirname, '..', 'package.json')

try {
  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf-8'))
  process.stdout.write(`${pkg.version}\n`)
} catch (err) {
  process.stderr.write(`Failed to read version: ${err.message}\n`)
  process.exit(1)
}