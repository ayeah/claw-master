# Claw Master 贡献指南

欢迎来到 Claw Master 贡献者社区！我们致力于将 Claw Master 打造为一个能够提供长期价值的项目，希望邀请更多开发者加入我们。无论你是经验丰富的开发者还是刚刚起步的初学者，你的贡献都将帮助我们更好地服务用户并提升软件质量。

## 如何贡献

以下是几种参与方式：

1.  **贡献代码**：帮助我们开发新功能或优化现有代码。请确保你的代码符合我们的编码规范并通过所有测试。

2.  **修复 Bug**：如果你发现了 Bug，欢迎提交修复方案。请在提交前确认问题已解决，并包含相关测试。

3.  **维护 Issues**：帮助我们管理 GitHub Issues，协助标签分类和问题解决。

4.  **产品设计**：参与产品设计讨论，帮助我们改善用户体验和界面设计。

5.  **编写文档**：帮助我们改进用户手册、API 文档和开发者指南。

6.  **社区维护**：参与社区讨论，帮助回答用户问题，促进社区活跃度。

7.  **推广使用**：通过博客、社交媒体等渠道推广 Claw Master，吸引更多用户和开发者。

## 开始之前

请确保你已阅读 [行为准则](CODE_OF_CONDUCT.md) 和 [许可证](LICENSE)。

## 设置开发环境

有关设置本地开发环境的说明，包括前置条件、安装步骤和可用命令，请参阅 [开发者指南](CLAUDE.md)。

## 入门

为了帮助你熟悉代码库，我们建议处理带有以下标签的问题：[good-first-issue](https://github.com/claw-master/claw-master/labels/good%20first%20issue)、[help-wanted](https://github.com/claw-master/claw-master/labels/help%20wanted) 或 [kind/bug](https://github.com/claw-master/claw-master/labels/kind/bug)。欢迎任何形式的帮助。

### 测试

没有测试的功能被视为不存在。为确保代码真正有效，相关流程应通过单元测试和功能测试进行覆盖。因此，在考虑贡献时，也请考虑可测试性。所有测试都可以在本地运行，无需依赖 CI。

### 自动化测试

自动化测试会在组织成员打开的 PR（Pull Request）上触发（draft PR 除外）。新贡献者提交的 PR 最初会标记为 `needs-ok-to-test`，不会自动测试。一旦组织成员在 PR 上添加 `/ok-to-test`，测试流水线就会创建。

### 考虑将 Pull Request 创建为草稿

并非所有 PR 在创建时都准备好进行审查。这可能是因为作者想要开始讨论，或者他们不完全确定更改方向是否正确，或者更改尚未完成。请将这些 PR 创建为[草稿 PR](https://github.blog/2019-02-14-introducing-draft-pull-requests/)。草稿 PR 会被 CI 跳过，从而节省 CI 资源。这也意味着不会自动分配审阅者，社区会理解该 PR 尚未准备好接受审阅。在你将草稿 PR 标记为准备好接受审阅后，审阅者将被分配。

### 贡献者合规

我们要求每个贡献者证明他们有权合法地向我们的项目做出贡献。贡献者通过有意识地签署他们的提交来表示同意遵守 [LICENSE](LICENSE)。

签署的提交是指提交消息包含以下内容：

```
Signed-off-by: Random J Developer <random@developer.example.org>
```

你可以使用以下命令生成签署的提交：

```
git commit --signoff -m "Your commit message"
```

### 获取代码审阅/合并

维护者会在合理的时间范围内帮助你实现你的用例。他们会尽力及时审阅你的代码并提供建设性的反馈。但是，如果你在审阅过程中遇到困难，或者你认为你的 Pull Request 没有得到应有的关注，请通过 Issue 中的评论或[社区](README.md)联系我们。

## 重要贡献指南和重点领域

在提交 Pull Request 之前，请查看以下关键信息：

### 分支策略

- **`main` 分支**：新功能开发、优化和针对当前代码库的修复在此进行。
- **功能分支**：请从 `main` 创建功能分支，命名规范为 `feature/`、`fix/` 或 `refactor/`。

### 编码规范

请遵循 [CLAUDE.md](CLAUDE.md) 中记录的编码规范，包括：

- 使用 ESLint 进行代码检查
- 使用 Biome 进行代码格式化
- 使用 Vitest 进行测试
- 提交前运行 `pnpm lint` 和 `pnpm test`

## 联系我们

如果你有任何问题或建议，欢迎通过以下方式联系我们：

- [GitHub Issues](https://github.com/claw-master/claw-master/issues)

感谢你的支持和贡献！期待与你一起让 Claw Master 变得更好。