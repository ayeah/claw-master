#!/bin/bash
#===============================================================================
# 脚本名称：deploy-to-github.sh
# 功能描述：将开发环境代码推送到 GitHub 进行版本管理
# 使用 Deploy Key 进行认证
#===============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
DEPLOY_KEY_PATH="/home/node/.openclaw/agents/it-team/workspace/github_deploy_key"
GITHUB_REPO=""  # GitHub 仓库地址 (格式：git@github.com:username/repo.git)
BRANCH_NAME="main"  # 默认分支
COMMIT_MESSAGE=""  # 提交信息
SOURCE_DIR=""  # 源代码目录

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示使用说明
show_usage() {
    cat << EOF
用法：$0 [选项]

选项:
    -r, --repo REPO         GitHub 仓库地址 (必填)
                            格式：git@github.com:username/repo.git
    -b, --branch BRANCH     分支名称 (默认：main)
    -m, --message MSG       提交信息 (默认：自动生成的时间戳)
    -s, --source DIR        源代码目录 (默认：当前目录)
    -k, --key PATH          Deploy Key 路径 (默认：使用生成的 key)
    -c, --check             仅检查配置，不执行推送
    -h, --help              显示此帮助信息

示例:
    # 基本用法
    $0 -r git@github.com:username/repo.git

    # 指定分支和提交信息
    $0 -r git@github.com:username/repo.git -b develop -m "feat: 新增功能"

    # 指定源代码目录
    $0 -r git@github.com:username/repo.git -s /path/to/source

    # 使用自定义 Deploy Key
    $0 -r git@github.com:username/repo.git -k /path/to/deploy_key

    # 仅检查配置
    $0 -r git@github.com:username/repo.git -c

EOF
}

# 解析命令行参数
CHECK_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -r|--repo)
            GITHUB_REPO="$2"
            shift 2
            ;;
        -b|--branch)
            BRANCH_NAME="$2"
            shift 2
            ;;
        -m|--message)
            COMMIT_MESSAGE="$2"
            shift 2
            ;;
        -s|--source)
            SOURCE_DIR="$2"
            shift 2
            ;;
        -k|--key)
            DEPLOY_KEY_PATH="$2"
            shift 2
            ;;
        -c|--check)
            CHECK_ONLY=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            log_error "未知选项：$1"
            show_usage
            exit 1
            ;;
    esac
done

# 生成默认提交信息
if [ -z "$COMMIT_MESSAGE" ]; then
    COMMIT_MESSAGE="chore: auto deploy $(date '+%Y-%m-%d %H:%M:%S')"
fi

# 默认源代码目录
if [ -z "$SOURCE_DIR" ]; then
    SOURCE_DIR="$(pwd)"
fi

#===============================================================================
# 主流程
#===============================================================================

echo ""
echo "==============================================================================="
echo "  🚀 GitHub 代码推送脚本"
echo "==============================================================================="
echo ""

# 1. 检查 Deploy Key
log_info "检查 Deploy Key..."
if [ ! -f "$DEPLOY_KEY_PATH" ]; then
    log_error "Deploy Key 不存在：$DEPLOY_KEY_PATH"
    log_info "请先运行：ssh-keygen -t ed25519 -C 'deploy-key' -f $DEPLOY_KEY_PATH -N ''"
    exit 1
fi

# 设置正确的权限
chmod 600 "$DEPLOY_KEY_PATH"
log_success "Deploy Key 存在且权限正确"

# 2. 显示公钥（用于配置到 GitHub）
echo ""
log_info "Deploy Key 公钥内容："
echo "-------------------------------------------------------------------------------"
cat "${DEPLOY_KEY_PATH}.pub"
echo "-------------------------------------------------------------------------------"
echo ""
log_info "请将上述公钥配置到 GitHub 仓库的 Settings -> Deploy keys -> Add deploy key"
echo ""

# 3. 检查 GitHub 仓库配置
if [ -z "$GITHUB_REPO" ]; then
    log_error "请指定 GitHub 仓库地址 (-r 参数)"
    show_usage
    exit 1
fi

log_info "GitHub 仓库：$GITHUB_REPO"
log_info "目标分支：$BRANCH_NAME"
log_info "提交信息：$COMMIT_MESSAGE"
log_info "源代码目录：$SOURCE_DIR"

# 4. 仅检查模式
if [ "$CHECK_ONLY" = true ]; then
    log_success "配置检查完成"
    echo ""
    echo "下一步操作:"
    echo "  1. 将上述公钥添加到 GitHub 仓库：https://github.com/设置你的仓库/settings/keys"
    echo "  2. 运行：$0 -r $GITHUB_REPO -b $BRANCH_NAME -m \"$COMMIT_MESSAGE\""
    echo ""
    exit 0
fi

# 5. 确认用户已配置 Deploy Key
echo ""
log_warning "请确认已将 Deploy Key 公钥添加到 GitHub 仓库"
log_warning "如果尚未添加，请先添加后重新运行此脚本"
echo ""
read -p "按回车继续，或 Ctrl+C 取消..." -n 1 -r
echo ""

# 6. 创建临时 SSH 配置
TEMP_SSH_CONFIG=$(mktemp)
cat > "$TEMP_SSH_CONFIG" << EOF
Host github.com
    HostName github.com
    User git
    IdentityFile $DEPLOY_KEY_PATH
    IdentitiesOnly yes
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
EOF

log_info "创建临时 SSH 配置：$TEMP_SSH_CONFIG"

# 7. 执行 Git 推送
log_info "开始推送代码到 GitHub..."

cd "$SOURCE_DIR"

# 初始化 Git 仓库（如果需要）
if [ ! -d ".git" ]; then
    log_info "初始化 Git 仓库..."
    git init
fi

# 配置 Git 使用临时 SSH 配置
export GIT_SSH_COMMAND="ssh -F $TEMP_SSH_CONFIG"

# 添加远程仓库（如果不存在）
if ! git remote | grep -q "origin"; then
    log_info "添加远程仓库..."
    git remote add origin "$GITHUB_REPO"
else
    # 更新现有远程仓库
    log_info "更新远程仓库..."
    git remote set-url origin "$GITHUB_REPO"
fi

# 添加所有文件
log_info "添加文件..."
git add -A

# 检查是否有变更
if git diff-index --quiet HEAD --; then
    log_warning "没有检测到代码变更"
else
    # 提交变更
    log_info "提交变更..."
    git commit -m "$COMMIT_MESSAGE"
    
    # 推送代码
    log_info "推送到 GitHub..."
    if git push -u origin "$BRANCH_NAME"; then
        log_success "代码推送成功!"
    else
        log_error "推送失败，请检查网络连接和 Deploy Key 配置"
        rm -f "$TEMP_SSH_CONFIG"
        exit 1
    fi
fi

# 清理临时文件
rm -f "$TEMP_SSH_CONFIG"

# 8. 显示推送信息
echo ""
echo "==============================================================================="
echo "  ✅ 代码推送完成!"
echo "==============================================================================="
echo ""
echo "  仓库地址：$GITHUB_REPO"
echo "  分支：    $BRANCH_NAME"
echo "  提交：    $COMMIT_MESSAGE"
echo "  时间：    $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "  查看代码：https://github.com/${GITHUB_REPO#git@github.com:} | sed 's/.git$//'"
echo ""
echo "==============================================================================="
echo ""
