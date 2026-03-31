#!/bin/bash
#===============================================================================
# GitHub 快速部署脚本
# 简化版：自动使用配置的 Deploy Key 推送到 GitHub
#===============================================================================

set -e

# 配置（请根据实际情况修改）
GITHUB_REPO="${GITHUB_REPO:-}"  # 通过环境变量或手动指定
BRANCH_NAME="${BRANCH_NAME:-main}"
DEPLOY_KEY_PATH="/home/node/.openclaw/agents/it-team/workspace/github_deploy_key"
SOURCE_DIR="${SOURCE_DIR:-$(pwd)}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "========================================"
echo "  🚀 GitHub 快速部署"
echo "========================================"
echo ""

# 检查仓库配置
if [ -z "$GITHUB_REPO" ]; then
    echo -e "${RED}[ERROR]${NC} 请设置 GITHUB_REPO 环境变量"
    echo ""
    echo "用法:"
    echo "  export GITHUB_REPO=git@github.com:username/repo.git"
    echo "  ./github-deploy-quick.sh"
    echo ""
    echo "或一次性命令:"
    echo "  GITHUB_REPO=git@github.com:username/repo.git ./github-deploy-quick.sh"
    echo ""
    exit 1
fi

# 检查 Deploy Key
if [ ! -f "$DEPLOY_KEY_PATH" ]; then
    echo -e "${RED}[ERROR]${NC} Deploy Key 不存在"
    echo "请先运行：ssh-keygen -t ed25519 -f $DEPLOY_KEY_PATH -N ''"
    exit 1
fi

chmod 600 "$DEPLOY_KEY_PATH"

# 生成提交信息
COMMIT_MESSAGE="chore: auto deploy $(date '+%Y-%m-%d %H:%M:%S')"

echo -e "${BLUE}[INFO]${NC} 仓库：$GITHUB_REPO"
echo -e "${BLUE}[INFO]${NC} 分支：$BRANCH_NAME"
echo -e "${BLUE}[INFO]${NC} 提交：$COMMIT_MESSAGE"
echo ""

# 创建临时 SSH 配置
TEMP_SSH=$(mktemp)
cat > "$TEMP_SSH" << EOF
Host github.com
    HostName github.com
    User git
    IdentityFile $DEPLOY_KEY_PATH
    IdentitiesOnly yes
    StrictHostKeyChecking no
EOF

export GIT_SSH_COMMAND="ssh -F $TEMP_SSH"

cd "$SOURCE_DIR"

# 初始化/配置 Git
[ ! -d ".git" ] && git init
git remote remove origin 2>/dev/null || true
git remote add origin "$GITHUB_REPO"

# 推送代码
git add -A
git diff-index --quiet HEAD -- && echo -e "${BLUE}[INFO]${NC} 无变更" || {
    git commit -m "$COMMIT_MESSAGE"
    git push -u origin "$BRANCH_NAME"
}

rm -f "$TEMP_SSH"

echo ""
echo -e "${GREEN}[SUCCESS]${NC} 推送完成!"
echo ""
