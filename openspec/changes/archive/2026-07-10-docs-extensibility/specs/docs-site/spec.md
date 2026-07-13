## ADDED Requirements

### Requirement: VitePress 双语信息架构
文档站点须基于 VitePress，并提供英文（canonical，locale `root`）与简体中文（`zh-CN`）平行的导航与侧栏，使读者无需阅读源码即可到达架构、manifest、命令参考、适配器贡献与示例模板等页面。

#### Scenario: 英文与中文侧栏结构一致
- **WHEN** 贡献者打开文档站点的英文与 zh-CN 导航/侧栏
- **THEN** 两侧须暴露同一组逻辑页面（架构、manifest、命令、示例模板、适配器 how-to），且路径在各自 locale 下平行对应

#### Scenario: 英文更新时的中文义务
- **WHEN** 某次变更新增或修改了 `docs/en/` 下的用户可见页面
- **THEN** 同一次变更须更新对应的 `zh-CN` 页面，或在 zh-CN 页面明确标注待翻译并提供指向英文页的链接

### Requirement: 架构总览页
文档须包含架构总览页，说明 imwel 作为无后端、Git 原生 CLI 的核心模型：模板仓与 manifest、每目录绑定、隐藏 history Git 仓、渲染适配器角色，以及「不静默覆盖本地手改 / 不写未管理文件」等安全默认。

#### Scenario: 读者理解 Git 为数据库
- **WHEN** 读者阅读架构总览页
- **THEN** 页面须说明内容身份与历史来自 Git 对象与提交图，且 imwel 不引入替代 Git 的自定义版本号或内容哈希体系

#### Scenario: 读者理解绑定粒度
- **WHEN** 读者阅读架构总览页中关于项目绑定的部分
- **THEN** 页面须说明 `.imwel` 绑定按目录而非按 Git 仓库，monorepo 通过在各子项目目录分别 `imwel init` 处理

### Requirement: Manifest schema 参考页
文档须包含 manifest 参考页，描述 `.imwel/manifest.yaml` 的字段与语义（根级 `conventions`、`projects` 的 `name`/`path`、可选 per-project `conventions` 覆盖、可选 `optional` Artifact 列表），并提供至少一份有效示例 YAML，语义与 `template-repository` 主规格一致。

#### Scenario: 读者按文档写出合法 manifest
- **WHEN** 读者按照 manifest 参考页中的字段说明与示例编写 `.imwel/manifest.yaml`
- **THEN** 文档中的必填结构须足以声明至少一个 project 及其 path，并说明 conventions 的默认与覆盖关系

#### Scenario: 文档说明 optional 行为
- **WHEN** 读者阅读 manifest 页关于 `optional` 的说明
- **THEN** 页面须说明未列入 optional 的 Artifact 视为必需，列入者在安装/同步时由用户选择是否包含

### Requirement: 命令参考页
文档须包含命令参考页，覆盖当前 CLI 已实现的用户可见命令（至少包括 `doctor`、`remote`、`template init`、`init`、`sync`、`status`、`rollback`、`push`、`propose`），说明各命令用途与典型前置条件，且不得将未实现的命令写成已可用功能。

#### Scenario: 命令表与产品动词一致
- **WHEN** 读者打开命令参考页
- **THEN** 所列命令名称须与已建立的产品动词一致，且每个命令有简要用途说明

#### Scenario: 依赖未落地的功能不伪装为已实现
- **WHEN** 文档提及仅在并行变更（如模板作者体验）中规划、尚未实现的能力
- **THEN** 命令参考页须将其标为规划中/见其他文档，或省略，而不得写成当前 CLI 已提供的命令

### Requirement: 示例或演示模板仓指引
文档须提供示例/演示模板仓库指引：通过官方示例仓链接（若已公布）、和/或指向本仓库 `templates/init` 脚手架作为最小示例，并在页内给出最小目录树与 manifest 片段，使读者能对照理解模板布局。

#### Scenario: 读者找到可对照的示例
- **WHEN** 读者打开示例模板指引页
- **THEN** 页面须提供至少一种可操作的对照路径（外链示例仓、或 `imwel template init` / `templates/init` 说明）以及最小目录结构说明

#### Scenario: 示例 URL 尚未确定时的占位
- **WHEN** 官方示例模板仓 URL 尚未在发布就绪相关变更中确定
- **THEN** 页面须使用明确的待定占位或仅依赖脚手架说明，且不得伪造已存在的托管示例仓地址为确定事实

### Requirement: 与并行路线图的内容对齐策略
文档实现须允许在 `oss-release-readiness` 与 `template-author-experience` 未完成时仍可交付本变更的必达页面；对安装/发布细节与作者 Slash/lint 工作流，须使用交叉引用或待对齐标注，而不是阻塞全部文档工作。

#### Scenario: 本变更必达页可独立验收
- **WHEN** 仅完成本变更且上述并行变更尚未合并
- **THEN** 架构、manifest、命令参考（已实现命令）、适配器 how-to 与示例指引（含占位策略）仍须可在站点中访问并满足其各自需求

#### Scenario: 依赖内容可后续补全
- **WHEN** 某段落依赖尚未落地的发布或作者体验文案
- **THEN** 该段落须显式标注待对齐或指向「以 README / 后续文档为准」，且不得断言未实现行为为当前事实
