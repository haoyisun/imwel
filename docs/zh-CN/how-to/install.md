# 如何安装 imwel

想先在本机装好可用的 `imwel`（或 `npx`），再做别的事？

**你将得到：** 可脚手架模板、绑定项目、渲染 Artifact 的 CLI——无账号、无托管服务。

## 前置

- Node.js ≥ 18.18
- 系统 `PATH` 上有 `git`（SSH 与凭据助手照常可用）

## 步骤

### 方式 A — 一次性（不装全局）

```bash
npx @culock/imwel@latest doctor
```

### 方式 B — 全局安装

```bash
npm install -g @culock/imwel
imwel doctor
```

安装后命令名仍是 `imwel`。

## 预期结果

`imwel doctor`（或 `npx` 形式）显示环境检查通过，或明确告诉你缺什么。

## 排错

| 问题 | 处理 |
|------|------|
| 全局安装后找不到 `imwel` | 确认 npm 全局 bin 在 `PATH`（Windows 常见 `%AppData%\npm`）。或改用 `npx @culock/imwel@latest …`。 |
| `no git binary found on PATH` | 安装 Git，重开终端，再跑 `imwel doctor`。 |
| Node 版本不对 | 升到 Node ≥ 18.18（`node -v`）。 |

## 关联

- 五分钟首胜 → [快速上手](../tutorials/quick-start.md)
- 旗标参考 → [命令](../reference/commands.md)
