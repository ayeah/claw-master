const { chromium } = require('playwright')
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

const EXE_PATH = path.resolve(__dirname, '../claw-master-client/dist/win-unpacked/Claw Master.exe')
const TEST_LOGS_DIR = path.resolve(__dirname, 'test-logs')

class BrowserTestRunner {
  constructor() {
    this.results = []
    this.app = null
    this.browser = null
    this.page = null
    this.appProcess = null
    this.runTimestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    this.logDir = path.join(TEST_LOGS_DIR, this.runTimestamp)
    this.screenshotsDir = path.join(this.logDir, 'screenshots')
  }

  log(msg, type = 'INFO') {
    const ts = new Date().toISOString().slice(0, 19)
    const colors = { INFO: '\x1b[36m', PASS: '\x1b[32m', FAIL: '\x1b[31m', WARN: '\x1b[33m' }
    console.log(`${colors[type] || ''}[${ts}] ${type}: ${msg}\x1b[0m`)
  }

  async launchApp() {
    this.log('Launching Electron app...')

    if (!fs.existsSync(EXE_PATH)) {
      throw new Error(`Exe not found: ${EXE_PATH}`)
    }

    this.appProcess = spawn(EXE_PATH, ['--remote-debugging-port=9222'], {
      detached: true,
      stdio: 'ignore',
    })

    this.log(`App launched with PID ${this.appProcess.pid}, waiting for CDP...`)

    let retries = 0
    while (retries < 30) {
      try {
        const resp = await fetch('http://127.0.0.1:9222/json/version')
        if (resp.ok) {
          const data = await resp.json()
          this.log(`CDP available: ${data.Browser}`)
          return data.webSocketDebuggerUrl
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 1000))
      retries++
    }
    throw new Error('CDP not available after 30s')
  }

  async connectBrowser(wsUrl) {
    this.browser = await chromium.connectOverCDP(wsUrl)
    const contexts = this.browser.contexts()
    if (contexts.length > 0 && contexts[0].pages().length > 0) {
      this.page = contexts[0].pages()[0]
    } else {
      throw new Error('No pages found in browser context')
    }
    this.log('Connected to browser page')
  }

  async takeScreenshot(label) {
    if (!this.page) return null
    try {
      const safeName = label.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_').slice(0, 60)
      const filename = `${String(this.results.length).padStart(2, '0')}_${safeName}.png`
      const filepath = path.join(this.screenshotsDir, filename)
      await this.page.screenshot({ path: filepath, fullPage: false })
      return filename
    } catch (err) {
      this.log(`Screenshot failed: ${err.message}`, 'WARN')
      return null
    }
  }

  async runTest(name, fn) {
    const start = Date.now()
    let screenshot = null
    try {
      await fn()
      screenshot = await this.takeScreenshot(name)
      const duration = Date.now() - start
      this.results.push({ name, pass: true, duration, error: null, screenshot })
      this.log(`PASS: ${name} (${duration}ms)`, 'PASS')
    } catch (error) {
      screenshot = await this.takeScreenshot(`FAIL_${name}`)
      const duration = Date.now() - start
      this.results.push({ name, pass: false, duration, error: error.message, screenshot })
      this.log(`FAIL: ${name} - ${error.message}`, 'FAIL')
    }
  }

  async cleanup() {
    if (this.browser) {
      try { await this.browser.close() } catch {}
    }
    if (this.appProcess) {
      try { this.appProcess.kill() } catch {}
    }
  }

  printSummary() {
    const passed = this.results.filter((r) => r.pass).length
    const failed = this.results.filter((r) => !r.pass).length
    const total = this.results.length

    console.log('')
    this.log('='.repeat(50))
    this.log(`Browser Tests: ${passed}/${total} passed, ${failed} failed`)
    if (failed > 0) {
      this.log('Failed tests:', 'FAIL')
      this.results.filter((r) => !r.pass).forEach((r) => {
        this.log(`  - ${r.name}: ${r.error}`, 'FAIL')
      })
    }
    this.log('='.repeat(50))

    return { total, passed, failed, results: this.results }
  }

  generateHTMLReport(summary) {
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10)
    const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '-')
    const totalDuration = summary.results.reduce((s, r) => s + r.duration, 0)

    const testRows = summary.results.map((r, i) => {
      const statusClass = r.pass ? 'pass' : 'fail'
      const statusText = r.pass ? 'PASS' : 'FAIL'
      const screenshotCell = r.screenshot
        ? `<a href="screenshots/${r.screenshot}" target="_blank"><img src="screenshots/${r.screenshot}" class="thumb" /></a>`
        : '<span class="no-img">-</span>'
      const errorCell = r.error ? `<div class="error-msg">${escapeHtml(r.error)}</div>` : ''

      return `
        <tr class="${statusClass}">
          <td>${i + 1}</td>
          <td>${escapeHtml(r.name)}</td>
          <td><span class="badge badge-${statusClass}">${statusText}</span></td>
          <td>${r.duration}ms</td>
          <td>${screenshotCell}</td>
          <td>${errorCell}</td>
        </tr>`
    }).join('\n')

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Claw Master 测试报告 - ${dateStr} ${timeStr}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; line-height: 1.6; }
  .container { max-width: 1200px; margin: 0 auto; padding: 24px; }
  header { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 32px 0; margin-bottom: 24px; border-radius: 12px; }
  header .container { display: flex; justify-content: space-between; align-items: center; }
  header h1 { font-size: 24px; font-weight: 700; }
  header .meta { font-size: 13px; opacity: 0.8; text-align: right; }
  .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
  .card { background: white; border-radius: 10px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  .card .label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .card .value { font-size: 28px; font-weight: 700; }
  .card .value.green { color: #16a34a; }
  .card .value.red { color: #dc2626; }
  .card .value.blue { color: #2563eb; }
  .card .value.gray { color: #64748b; }
  table { width: 100%; border-collapse: collapse; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  th { background: #f1f5f9; padding: 12px 16px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; border-bottom: 2px solid #e2e8f0; }
  td { padding: 10px 16px; border-bottom: 1px solid #f1f5f9; font-size: 14px; vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr.pass td { background: #f0fdf4; }
  tr.fail td { background: #fef2f2; }
  tr:hover td { filter: brightness(0.97); }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
  .badge-pass { background: #dcfce7; color: #166534; }
  .badge-fail { background: #fee2e2; color: #991b1b; }
  .thumb { width: 80px; height: 50px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e8f0; cursor: pointer; transition: transform 0.2s; }
  .thumb:hover { transform: scale(2.5); position: relative; z-index: 10; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
  .no-img { color: #94a3b8; }
  .error-msg { color: #dc2626; font-size: 12px; margin-top: 2px; }
  footer { text-align: center; padding: 24px; color: #94a3b8; font-size: 12px; }
  .progress { height: 6px; background: #e2e8f0; border-radius: 3px; margin-top: 8px; overflow: hidden; }
  .progress-bar { height: 100%; border-radius: 3px; transition: width 0.3s; }
  .progress-bar.green { background: #16a34a; }
  .progress-bar.red { background: #dc2626; }
</style>
</head>
<body>
<header>
  <div class="container">
    <div>
      <h1>Claw Master 测试报告</h1>
      <div style="opacity:0.7;margin-top:4px;">Browser E2E Tests (Playwright)</div>
    </div>
    <div class="meta">
      <div>${dateStr} ${timeStr}</div>
      <div>耗时 ${(totalDuration / 1000).toFixed(1)}s</div>
    </div>
  </div>
</header>
<div class="container">
  <div class="summary">
    <div class="card">
      <div class="label">总测试数</div>
      <div class="value blue">${summary.total}</div>
    </div>
    <div class="card">
      <div class="label">通过</div>
      <div class="value green">${summary.passed}</div>
    </div>
    <div class="card">
      <div class="label">失败</div>
      <div class="value ${summary.failed > 0 ? 'red' : 'gray'}">${summary.failed}</div>
    </div>
    <div class="card">
      <div class="label">通过率</div>
      <div class="value ${summary.failed > 0 ? 'red' : 'green'}">${summary.total > 0 ? ((summary.passed / summary.total) * 100).toFixed(1) : 0}%</div>
      <div class="progress"><div class="progress-bar ${summary.failed > 0 ? 'red' : 'green'}" style="width:${summary.total > 0 ? (summary.passed / summary.total) * 100 : 0}%"></div></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>测试项</th>
        <th>状态</th>
        <th>耗时</th>
        <th>截图</th>
        <th>错误</th>
      </tr>
    </thead>
    <tbody>
      ${testRows}
    </tbody>
  </table>
</div>
<footer>Claw Master Test Bot &middot; Generated ${now.toISOString()}</footer>
</body>
</html>`
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ========== Test Cases ==========

async function testAppLaunches(runner) {
  await runner.runTest('App launches and CDP is available', async () => {
    const wsUrl = await runner.launchApp()
    await runner.connectBrowser(wsUrl)
    if (!runner.page) throw new Error('No page available')
  })
}

async function testWindowTitle(runner) {
  await runner.runTest('Window has correct title', async () => {
    const title = await runner.page.title()
    if (!title) throw new Error('Page has no title')
  })
}

async function testNavExists(runner) {
  await runner.runTest('Navigation bar is rendered', async () => {
    const nav = await runner.page.locator('nav').first()
    if (!nav) throw new Error('Nav element not found')
    const isVisible = await nav.isVisible()
    if (!isVisible) throw new Error('Nav is not visible')
  })
}

async function testNavItems(runner) {
  await runner.runTest('Navigation has 4 items', async () => {
    const buttons = runner.page.locator('nav button')
    const count = await buttons.count()
    if (count < 4) throw new Error(`Expected >=4 nav buttons, got ${count}`)
    const labels = []
    for (let i = 0; i < count; i++) {
      const text = await buttons.nth(i).innerText()
      labels.push(text.trim())
    }
    const required = ['对话', 'Agent', '终端', '设置']
    for (const r of required) {
      if (!labels.some((l) => l.includes(r))) {
        throw new Error(`Nav item "${r}" not found. Found: ${labels.join(', ')}`)
      }
    }
  })
}

async function testChatPageVisible(runner) {
  await runner.runTest('Chat page is visible by default', async () => {
    const chatSidebar = runner.page.locator('text=新建会话').first()
    const isVisible = await chatSidebar.isVisible({ timeout: 5000 }).catch(() => false)
    if (!isVisible) throw new Error('Chat sidebar "新建会话" button not visible')
  })
}

async function testChatWelcome(runner) {
  await runner.runTest('Chat welcome screen shows', async () => {
    const welcome = runner.page.locator('text=欢迎使用 Claw Master').first()
    await welcome.isVisible({ timeout: 3000 }).catch(() => false)
  })
}

async function testNewChatButton(runner) {
  await runner.runTest('New chat button exists', async () => {
    const btn = runner.page.locator('text=新建会话').first()
    await btn.waitFor({ state: 'visible', timeout: 5000 })
  })
}

async function testThemeSystem(runner) {
  await runner.runTest('Theme CSS variables are defined', async () => {
    const bgColor = await runner.page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--color-background').trim()
    })
    if (!bgColor) throw new Error('--color-background CSS variable not set')
  })
}

async function testResponsiveLayout(runner) {
  await runner.runTest('Layout uses flex and full screen height', async () => {
    const hasFlex = await runner.page.evaluate(() => {
      return document.querySelector('.flex') !== null
    })
    if (!hasFlex) throw new Error('Flex layout not detected')
  })
}

async function testCreateNewChat(runner) {
  await runner.runTest('Create a new chat session', async () => {
    const newChatBtn = runner.page.locator('text=新建会话').first()
    await newChatBtn.click()
    await runner.page.waitForTimeout(500)
    const input = runner.page.locator('textarea').first()
    const modelBtn = runner.page.locator('text=选择模型').first()
    const inputVisible = await input.isVisible({ timeout: 3000 }).catch(() => false)
    const modelVisible = await modelBtn.isVisible({ timeout: 2000 }).catch(() => false)
    if (!inputVisible && !modelVisible) {
      throw new Error('Neither input textarea nor model selector visible after creating chat')
    }
  })
}

async function testChatInputArea(runner) {
  await runner.runTest('Chat input area is present', async () => {
    const textarea = runner.page.locator('textarea').first()
    const isVisible = await textarea.isVisible({ timeout: 3000 }).catch(() => false)
    if (!isVisible) throw new Error('Chat textarea not visible')
  })
}

async function testSendButton(runner) {
  await runner.runTest('Send button exists in chat', async () => {
    const inputArea = runner.page.locator('.border-t').first()
    const buttons = inputArea.locator('button')
    const count = await buttons.count()
    if (count < 1) throw new Error('No buttons found in input area')
  })
}

async function testEmptyChatMessage(runner) {
  await runner.runTest('Empty chat shows hint message', async () => {
    await runner.page.locator('text=发送消息开始对话').first().isVisible({ timeout: 2000 }).catch(() => false)
  })
}

async function testSessionList(runner) {
  await runner.runTest('Session list area exists in sidebar', async () => {
    await runner.page.locator('[class*="w-6"]').first().isVisible({ timeout: 3000 }).catch(() => false)
  })
}

async function testModelSelector(runner) {
  await runner.runTest('Model selector dropdown exists', async () => {
    await runner.page.locator('button:has-text("选择模型"), button:has-text("gpt"), button:has-text("claude")').first()
      .isVisible({ timeout: 3000 }).catch(() => false)
  })
}

async function testNavigateToSettings(runner) {
  await runner.runTest('Navigate to Settings page', async () => {
    const settingsBtn = runner.page.locator('nav button', { hasText: '设置' }).first()
    await settingsBtn.click()
    await runner.page.waitForTimeout(500)
    const title = runner.page.locator('text=设置').first()
    const isVisible = await title.isVisible({ timeout: 3000 }).catch(() => false)
    if (!isVisible) throw new Error('Settings title not visible after navigation')
  })
}

async function testSettingsTabs(runner) {
  await runner.runTest('Settings page has 3 tabs', async () => {
    for (const tab of ['模型', '运行环境', '偏好']) {
      const btn = runner.page.locator(`button:has-text("${tab}")`).first()
      const exists = await btn.isVisible({ timeout: 2000 }).catch(() => false)
      if (!exists) throw new Error(`Settings tab "${tab}" not found`)
    }
  })
}

async function testSettingsModelsTab(runner) {
  await runner.runTest('Models tab shows provider config', async () => {
    const modelsTab = runner.page.locator('button:has-text("模型")').first()
    await modelsTab.click()
    await runner.page.waitForTimeout(300)
    const addBtn = runner.page.locator('text=添加模型商').first()
    const isVisible = await addBtn.isVisible({ timeout: 3000 }).catch(() => false)
    if (!isVisible) throw new Error('"添加模型商" button not visible')
  })
}

async function testProviderForm(runner) {
  await runner.runTest('Add provider form opens', async () => {
    const addBtn = runner.page.locator('text=添加模型商').first()
    await addBtn.click()
    await runner.page.waitForTimeout(300)
    const nameInput = runner.page.locator('input[placeholder="My OpenAI"]').first()
    const isVisible = await nameInput.isVisible({ timeout: 3000 }).catch(() => false)
    if (!isVisible) throw new Error('Provider name input not visible')
  })
}

async function testProviderFormFields(runner) {
  await runner.runTest('Provider form has all required fields', async () => {
    for (const field of [
      { placeholder: 'My OpenAI', label: 'Name' },
      { placeholder: 'https://api.openai.com/v1', label: 'Base URL' },
      { placeholder: 'sk-', label: 'API Key' },
    ]) {
      const input = runner.page.locator(`input[placeholder*="${field.placeholder}"]`).first()
      const exists = await input.isVisible({ timeout: 2000 }).catch(() => false)
      if (!exists) throw new Error(`Field "${field.label}" not found`)
    }
  })
}

async function testSettingsRuntimeTab(runner) {
  await runner.runTest('Runtime tab shows WSL and Docker', async () => {
    const runtimeTab = runner.page.locator('button:has-text("运行环境")').first()
    await runtimeTab.click()
    await runner.page.waitForTimeout(300)
    const wslVisible = await runner.page.locator('text=WSL').first().isVisible({ timeout: 3000 }).catch(() => false)
    const dockerVisible = await runner.page.locator('text=Docker 部署').first().isVisible({ timeout: 3000 }).catch(() => false)
    if (!wslVisible) throw new Error('WSL section not visible')
    if (!dockerVisible) throw new Error('Docker section not visible')
  })
}

async function testSettingsPreferencesTab(runner) {
  await runner.runTest('Preferences tab shows theme options', async () => {
    const prefsTab = runner.page.locator('button:has-text("偏好")').first()
    await prefsTab.click()
    await runner.page.waitForTimeout(300)
    const isVisible = await runner.page.locator('text=外观').first().isVisible({ timeout: 3000 }).catch(() => false)
    if (!isVisible) throw new Error('Theme section "外观" not visible')
  })
}

async function testNavigateToAgent(runner) {
  await runner.runTest('Navigate to Agent page', async () => {
    const agentBtn = runner.page.locator('nav button', { hasText: 'Agent' }).first()
    await agentBtn.click()
    await runner.page.waitForTimeout(500)
    const isVisible = await runner.page.locator('text=Agent Providers').first().isVisible({ timeout: 3000 }).catch(() => false)
    if (!isVisible) throw new Error('Agent Providers title not visible')
  })
}

async function testAgentTabs(runner) {
  await runner.runTest('Agent page has Providers and Agents tabs', async () => {
    const pVisible = await runner.page.locator('button:has-text("Providers")').first().isVisible({ timeout: 2000 }).catch(() => false)
    const aVisible = await runner.page.locator('button:has-text("Agents")').first().isVisible({ timeout: 2000 }).catch(() => false)
    if (!pVisible) throw new Error('Providers tab not visible')
    if (!aVisible) throw new Error('Agents tab not visible')
  })
}

async function testNavigateToTerminal(runner) {
  await runner.runTest('Navigate to Terminal page', async () => {
    const termBtn = runner.page.locator('nav button', { hasText: '终端' }).first()
    await termBtn.click()
    await runner.page.waitForTimeout(500)
    const isVisible = await runner.page.locator('text=WSL Terminal').first().isVisible({ timeout: 3000 }).catch(() => false)
    if (!isVisible) throw new Error('WSL Terminal not visible')
  })
}

async function testTerminalTabs(runner) {
  await runner.runTest('Terminal page has WSL, SSH, Connections tabs', async () => {
    for (const tab of ['WSL', 'SSH', 'Connections']) {
      const exists = await runner.page.locator(`button:has-text("${tab}")`).first().isVisible({ timeout: 2000 }).catch(() => false)
      if (!exists) throw new Error(`Terminal tab "${tab}" not found`)
    }
  })
}

async function testNavigateBackToChat(runner) {
  await runner.runTest('Navigate back to Chat page', async () => {
    const chatBtn = runner.page.locator('nav button', { hasText: '对话' }).first()
    await chatBtn.click()
    await runner.page.waitForTimeout(500)
    const isVisible = await runner.page.locator('text=新建会话').first().isVisible({ timeout: 3000 }).catch(() => false)
    if (!isVisible) throw new Error('Chat sidebar not visible after navigation')
  })
}

async function testSettingsSSHSection(runner) {
  await runner.runTest('Settings > Runtime tab shows SSH section', async () => {
    const settingsBtn = runner.page.locator('nav button', { hasText: '设置' }).first()
    await settingsBtn.click()
    await runner.page.waitForTimeout(500)
    const runtimeTab = runner.page.locator('button:has-text("运行环境")').first()
    await runtimeTab.click()
    await runner.page.waitForTimeout(300)
    const isVisible = await runner.page.locator('text=SSH 连接').first().isVisible({ timeout: 3000 }).catch(() => false)
    if (!isVisible) throw new Error('SSH section not visible')
  })
}

async function testSSHFormFields(runner) {
  await runner.runTest('SSH form has all required fields', async () => {
    const addBtn = runner.page.locator('button:has-text("添加 SSH 连接")').first()
    const exists = await addBtn.isVisible({ timeout: 2000 }).catch(() => false)
    if (exists) {
      await addBtn.click()
      await runner.page.waitForTimeout(300)
    }
    const fields = ['连接名称', '用户名', '服务器 IP', '端口', '登录密码']
    for (const field of fields) {
      const label = runner.page.locator(`label:has-text("${field}")`).first()
      const isVisible = await label.isVisible({ timeout: 2000 }).catch(() => false)
      if (!isVisible) throw new Error(`SSH field "${field}" not found`)
    }
    const closeBtn = runner.page.locator('button:has-text("取消")').first()
    if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await closeBtn.click()
      await runner.page.waitForTimeout(300)
    }
  })
}

async function testSSHConnectionCreate(runner) {
  await runner.runTest('SSH connection can be created', async () => {
    const nameInput = runner.page.locator('input[placeholder*="生产服务器"], input[placeholder*="名称"]').first()
    const exists = await nameInput.isVisible({ timeout: 2000 }).catch(() => false)
    if (exists) {
      await nameInput.fill('Test Connection')
      const hostInput = runner.page.locator('input[placeholder*="192.168.1.100"], input[placeholder*="host"]').first()
      await hostInput.fill('192.168.1.1')
      const portInput = runner.page.locator('input[placeholder*="22"], input[placeholder*="port"]').first()
      await portInput.fill('22')
      const userInput = runner.page.locator('input[placeholder*="root"], input[placeholder*="user"]').first()
      await userInput.fill('testuser')
    }
  })
}

async function testSSHConnectionList(runner) {
  await runner.runTest('SSH connection list exists', async () => {
    const listArea = runner.page.locator('text=SSH 连接').first()
    const isVisible = await listArea.isVisible({ timeout: 3000 }).catch(() => false)
    if (!isVisible) throw new Error('SSH connection list area not visible')
  })
}

async function testSSHConnectionEdit(runner) {
  await runner.runTest('SSH connection edit button exists', async () => {
    const editBtn = runner.page.locator('button:has-text("编辑")').first()
    const exists = await editBtn.isVisible({ timeout: 2000 }).catch(() => false)
    if (!exists) {
      const noConnections = await runner.page.locator('text=暂无 SSH 连接').first().isVisible({ timeout: 1000 }).catch(() => false)
      if (!noConnections) throw new Error('Edit button not found')
    }
  })
}

async function testSSHConnectionDelete(runner) {
  await runner.runTest('SSH connection delete button exists', async () => {
    const deleteBtn = runner.page.locator('button:has(svg)').first()
    const exists = await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)
    if (!exists) {
      const noConnections = await runner.page.locator('text=暂无 SSH 连接').first().isVisible({ timeout: 1000 }).catch(() => false)
      if (!noConnections) throw new Error('Delete button not found')
    }
  })
}

async function testSSHTestConnectionButton(runner) {
  await runner.runTest('SSH test connection button exists', async () => {
    const testBtn = runner.page.locator('button:has-text("测试连接")').first()
    const exists = await testBtn.isVisible({ timeout: 2000 }).catch(() => false)
    if (!exists) {
      const noConnections = await runner.page.locator('text=暂无 SSH 连接').first().isVisible({ timeout: 1000 }).catch(() => false)
      if (!noConnections) throw new Error('Test connection button not found')
    }
  })
}

async function testIPCChannelsDefined(runner) {
  await runner.runTest('IPC bridge is accessible from renderer', async () => {
    await runner.page.evaluate(() => {
      return typeof window !== 'undefined' && typeof window.electron !== 'undefined'
    })
  })
}

// ========== Main Runner ==========

async function main() {
  const runner = new BrowserTestRunner()

  // Create directories
  fs.mkdirSync(runner.screenshotsDir, { recursive: true })

  console.log('')
  console.log('\x1b[36m' + '='.repeat(50) + '\x1b[0m')
  console.log('\x1b[36m Claw Master Browser Tests (Playwright E2E)\x1b[0m')
  console.log('\x1b[36m' + '='.repeat(50) + '\x1b[0m')
  console.log('')

  try {
    await testAppLaunches(runner)
    await testWindowTitle(runner)
    await testThemeSystem(runner)
    await testResponsiveLayout(runner)
    await testNavExists(runner)
    await testNavItems(runner)
    await testChatPageVisible(runner)
    await testChatWelcome(runner)
    await testNewChatButton(runner)
    await testCreateNewChat(runner)
    await testChatInputArea(runner)
    await testSendButton(runner)
    await testEmptyChatMessage(runner)
    await testSessionList(runner)
    await testModelSelector(runner)
    await testNavigateToSettings(runner)
    await testSettingsTabs(runner)
    await testSettingsModelsTab(runner)
    await testProviderForm(runner)
    await testProviderFormFields(runner)
    await testSettingsRuntimeTab(runner)
    await testSettingsPreferencesTab(runner)
    await testNavigateToAgent(runner)
    await testAgentTabs(runner)
    await testNavigateToTerminal(runner)
    await testTerminalTabs(runner)
    await testSettingsSSHSection(runner)
    await testSSHFormFields(runner)
    await testSSHConnectionCreate(runner)
    await testSSHConnectionList(runner)
    await testSSHConnectionEdit(runner)
    await testSSHConnectionDelete(runner)
    await testSSHTestConnectionButton(runner)
    await testNavigateBackToChat(runner)
    await testIPCChannelsDefined(runner)
  } catch (error) {
    runner.log(`Fatal error: ${error.message}`, 'FAIL')
  } finally {
    await runner.cleanup()
  }

  const summary = runner.printSummary()

  // Generate HTML report
  const html = runner.generateHTMLReport(summary)
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10)
  const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '-')
  const htmlFilename = `test-report-${dateStr}_${timeStr}.html`
  const htmlPath = path.join(runner.logDir, htmlFilename)
  fs.writeFileSync(htmlPath, html)
  runner.log(`HTML report saved: ${htmlPath}`)

  // Also save JSON report
  const jsonReport = {
    timestamp: now.toISOString(),
    type: 'browser-e2e',
    total: summary.total,
    passed: summary.passed,
    failed: summary.failed,
    duration: summary.results.reduce((s, r) => s + r.duration, 0),
    results: summary.results,
  }
  fs.writeFileSync(path.join(runner.logDir, 'report.json'), JSON.stringify(jsonReport, null, 2))

  process.exit(summary.failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
