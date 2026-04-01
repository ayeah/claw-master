#!/bin/bash
# GitHub 仓库清理脚本
# 删除所有敏感信息和开发过程文件，只保留系统代码和必要文档

set -e

echo "🧹 开始清理 GitHub 仓库..."
echo ""

# 切换到工作区目录
cd /home/node/.openclaw/agents/it-team/workspace

echo "📋 步骤 1: 从 Git 跟踪中删除敏感文件..."

# 删除敏感密钥文件
git rm --cached github_deploy_key 2>/dev/null || true
git rm --cached github_deploy_key.pub 2>/dev/null || true

# 删除开发过程文档
git rm --cached *_PROGRESS.md 2>/dev/null || true
git rm --cached *_REPORT.md 2>/dev/null || true
git rm --cached *_STATUS.md 2>/dev/null || true
git rm --cached DEV_*.md 2>/dev/null || true
git rm --cached TEST_*.md 2>/dev/null || true
git rm --cached PUSH-*.md 2>/dev/null || true
git rm --cached GITHUB_*.md 2>/dev/null || true
git rm --cached DOCKER_*.md 2>/dev/null || true
git rm --cached CLAW_MASTER_*.md 2>/dev/null || true
git rm --cached CONTAINER_*.md 2>/dev/null || true

# 删除测试脚本
git rm --cached test_*.js 2>/dev/null || true
git rm --cached test_*.py 2>/dev/null || true
git rm --cached migrate_*.js 2>/dev/null || true
git rm --cached migrate_*.py 2>/dev/null || true
git rm --cached check_*.js 2>/dev/null || true
git rm --cached check_*.py 2>/dev/null || true
git rm --cached run_db_test.sh 2>/dev/null || true

# 删除临时脚本
git rm --cached docker_container_viewer.py 2>/dev/null || true
git rm --cached init_db_simple.js 2>/dev/null || true
git rm --cached github-deploy-quick.sh 2>/dev/null || true
git rm --cached deploy-quickstart.md 2>/dev/null || true
git rm --cached DEPLOY.md 2>/dev/null || true
git rm --cached DEPLOY_STATUS.md 2>/dev/null || true
git rm --cached docker_socket_analysis.md 2>/dev/null || true

# 删除 OpenClaw 内部文件（如果误提交）
git rm --cached -r .openclaw/ 2>/dev/null || true
git rm --cached USER.md 2>/dev/null || true
git rm --cached SOUL.md 2>/dev/null || true
git rm --cached AGENTS.md 2>/dev/null || true
git rm --cached IDENTITY.md 2>/dev/null || true
git rm --cached HEARTBEAT.md 2>/dev/null || true
git rm --cached BOOTSTRAP.md 2>/dev/null || true
git rm --cached TOOLS.md 2>/dev/null || true

# 删除 Python 虚拟环境
git rm --cached -r venv/ 2>/dev/null || true

# 删除 package-lock.json
git rm --cached package-lock.json 2>/dev/null || true

echo "✅ 敏感文件已从 Git 跟踪中移除"
echo ""

echo "📋 步骤 2: 提交清理..."
git add .gitignore
git commit -m "chore: 清理敏感文件和开发过程文档

- 删除 SSH 密钥文件
- 删除开发进度报告
- 删除测试报告
- 删除测试脚本
- 删除临时脚本
- 删除 OpenClaw 内部文件
- 更新 .gitignore

GitHub 仓库现在只包含系统代码和必要文档"

echo "✅ 清理提交完成"
echo ""

echo "⚠️  步骤 3: 需要强制推送到 GitHub"
echo ""
echo "请执行以下命令："
echo "  git push --force-with-lease origin main"
echo ""
echo "这将重写 Git 历史，确保敏感信息彻底删除"
echo ""

# 显示当前状态
echo "📊 当前 Git 状态:"
git status --short
