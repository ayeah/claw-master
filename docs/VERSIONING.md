# 📋 版本管理规范

**文档位置：** `docs/VERSIONING.md`  
**版本文件：** `VERSION`  
**管理工具：** `tools/version.py`

---

## 🎯 版本号格式

```
<大版本>.<小版本>.<补丁版本>
  │      │      │
  │      │      └─ 补丁版本 (Patch)
  │      └──────── 小版本 (Minor)
  └─────────────── 大版本 (Major)
```

**示例：** `0.4.1`

---

## 📝 版本更新规则

### 补丁版本 +1 (Patch)

**触发条件：** 每次编译后

**场景：**
- Bug 修复
- 性能优化
- 文档更新
- 小幅改进

**命令：**
```bash
python3 tools/version.py bump patch
```

**示例：**
```
0.4.0 → 0.4.1
0.4.1 → 0.4.2
```

---

### 小版本 +1 (Minor)

**触发条件：** 增加了功能模块

**场景：**
- 完成一个新模块（如用户管理、组织架构）
- 增加新功能特性
- 向后兼容的功能增强

**命令：**
```bash
python3 tools/version.py bump minor
```

**示例：**
```
0.3.0 → 0.4.0
0.4.2 → 0.5.0
```

---

### 大版本 +1 (Major)

**触发条件：**
1. 完成全部功能开发后
2. 进行了框架重构或重大技术变革后

**场景：**
- 完成 Phase 1/2/3 全部功能
- 架构重构（如单体→微服务）
- 重大技术栈变更
- 不向后兼容的 API 变更

**命令：**
```bash
python3 tools/version.py bump major
```

**示例：**
```
0.x.x → 1.0.0  (正式发布)
1.5.2 → 2.0.0  (重大变革)
```

---

## 🛠️ 版本管理工具

**位置：** `tools/version.py`

### 命令列表

| 命令 | 说明 | 示例 |
|------|------|------|
| `show` | 显示当前版本 | `python3 tools/version.py show` |
| `bump patch` | 补丁版本 +1 | `python3 tools/version.py bump patch` |
| `bump minor` | 小版本 +1 | `python3 tools/version.py bump minor` |
| `bump major` | 大版本 +1 | `python3 tools/version.py bump major` |
| `history` | 显示版本历史 | `python3 tools/version.py history` |

### 使用示例

```bash
# 查看当前版本
$ python3 tools/version.py show
当前版本：0.4.0

# 修复 bug 后，补丁版本 +1
$ python3 tools/version.py bump patch
✅ 版本号已更新：0.4.0 → 0.4.1

# 完成新功能模块，小版本 +1
$ python3 tools/version.py bump minor
✅ 版本号已更新：0.4.1 → 0.5.0

# 完成全部功能，大版本 +1
$ python3 tools/version.py bump major
✅ 版本号已更新：0.5.0 → 1.0.0

# 查看版本历史
$ python3 tools/version.py history
## 📝 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0.0 | 2026-04-01 | 待填写 |
| 0.5.0 | 2026-04-01 | 待填写 |
...
```

---

## 📊 版本历史记录

版本历史记录在 `VERSION` 文件中，格式为 Markdown 表格：

```markdown
| 版本 | 日期 | 说明 |
|------|------|------|
| 0.4.1 | 2026-04-01 | GitHub 仓库重组 |
| 0.4.0 | 2026-03-31 | API Gateway 基础架构 |
| 0.3.0 | 2026-03-31 | 组织架构模块 |
| 0.2.0 | 2026-03-xx | 用户管理模块 |
| 0.1.0 | 2026-03-xx | 初始版本 |
```

---

## 🎯 当前版本状态

**版本：** 0.4.0  
**阶段：** Phase 1 - 核心中转（P0）  
**进度：** 45%

### 版本里程碑

| 版本 | 日期 | 模块 | 阶段 |
|------|------|------|------|
| 0.1.0 | 2026-03-xx | 项目初始化 | Phase 0 |
| 0.2.0 | 2026-03-xx | 用户管理模块 | Phase 1 P0 |
| 0.3.0 | 2026-03-31 | 组织架构模块 | Phase 1 P1 |
| 0.4.0 | 2026-03-31 | API Gateway 基础架构 | Phase 1 P0 |
| 0.5.0 | 待完成 | API Gateway 请求中转 | Phase 1 P0 |
| 0.6.0 | 待完成 | 计费服务 | Phase 1 P0 |
| 0.7.0 | 待完成 | 限流增强 | Phase 1 P1 |
| 1.0.0 | 待完成 | Phase 1 完成 | Phase 1 Complete |

---

## 📌 发布流程

### 1. 开发阶段

每次提交代码时，使用当前开发版本号：
```
0.4.0-dev
```

### 2. 编译/构建

每次编译后，补丁版本 +1：
```bash
python3 tools/version.py bump patch
git add VERSION
git commit -m "build: 版本号更新到 0.4.1"
```

### 3. 功能完成

完成一个功能模块后，小版本 +1：
```bash
python3 tools/version.py bump minor
git add VERSION
git commit -m "feat: 完成 XX 模块，版本号更新到 0.5.0"
```

### 4. 正式发布

完成全部功能后，大版本 +1：
```bash
python3 tools/version.py bump major
git add VERSION
git commit -m "release: 正式发布 v1.0.0"
git tag v1.0.0
git push origin main --tags
```

---

## 🔖 Git Tag 规范

### Tag 格式

```
v<版本号>
```

**示例：**
```
v0.4.0
v0.4.1
v1.0.0
```

### 创建 Tag

```bash
# 创建轻量标签
git tag v0.4.0

# 创建附注标签（推荐）
git tag -a v0.4.0 -m "Release version 0.4.0 - API Gateway 基础架构"

# 推送标签
git push origin v0.4.0

# 推送所有标签
git push origin --tags
```

### 查看标签

```bash
# 查看所有标签
git tag

# 查看标签详情
git show v0.4.0

# 按版本过滤
git tag -l "v0.*"
```

---

## 📝 版本更新清单

每次更新版本号时，需要：

- [x] 更新 `VERSION` 文件中的当前版本号
- [x] 在版本历史中添加新记录
- [x] 更新 `docs/VERSIONING.md` 中的版本状态
- [x] 提交并推送变更
- [ ] 创建 Git Tag（正式发布时）
- [ ] 更新 CHANGELOG（如有）

---

## 🎉 最佳实践

### ✅ 推荐

- 每次编译后自动补丁版本 +1
- 完成功能模块后小版本 +1
- 使用版本管理工具自动更新
- 在 Git 提交信息中注明版本号变更
- 正式发布时创建 Git Tag

### ❌ 避免

- 跳过版本号（如 0.4.0 → 0.6.0）
- 手动编辑 VERSION 文件（使用工具）
- 忘记更新版本历史
- 在开发分支使用正式版本号

---

## 📖 相关文档

- [VERSION](../VERSION) - 版本号文件
- [tools/version.py](../tools/version.py) - 版本管理工具
- [README.md](../README.md) - 项目说明
- [MODULES.md](MODULES.md) - 模块说明

---

*最后更新：2026-04-01*  
*版本：0.4.0*
