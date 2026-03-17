# 演示文稿

## Speckit 与 OpenSpec 协同介绍

- **文件**：`speckit-openspec-协同介绍.md`
- **内容**：为什么用、怎么用、什么情况下用、优点（Marp 幻灯片格式）

### 如何导出为 PPT/PDF

1. **VS Code + Marp 插件**  
   安装 [Marp for VS Code](https://marketplace.visualstudio.com/items?itemName=marp-team.marp-vscode)，打开该 `.md` 文件，使用「Marp: Export Slide Deck」导出为 PDF 或 PPTX。

2. **Marp CLI**  
   ```bash
   npx @marp-team/marp-cli speckit-openspec-协同介绍.md --pdf
   # 或
   npx @marp-team/marp-cli speckit-openspec-协同介绍.md --pptx
   ```

3. **复制到 PowerPoint**  
   将每页 `---` 分隔的内容按页复制到 PowerPoint 中，自行排版。
