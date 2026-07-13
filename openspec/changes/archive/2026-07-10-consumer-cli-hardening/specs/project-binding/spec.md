## ADDED Requirements

### Requirement: Non-interactive init with explicit selections
当调用方通过命令行提供与引导式流程等价的全部选择（目标工具集合、remote、branch、manifest project、optional 制品策略），`imwel init` SHALL 在不打开交互式选择提示的情况下完成绑定与安装。若当前目录已存在 `.imwel` 绑定，CLI SHALL 仅在调用方显式确认覆盖（`--yes` 或等价确认 flag）后覆盖；否则 SHALL 拒绝覆盖并保持原绑定不变。非交互参数不完整时的失败语义见 `cli-noninteractive`。

#### Scenario: Init with full non-interactive selections
- **WHEN** 用户在未绑定目录运行带完整选择参数的 `imwel init`（无需再回答选择类提示）
- **THEN** CLI SHALL 安装所需与所选 optional 制品（适配每一个所选工具），并写入记录完整选择的 `.imwel` 文件

#### Scenario: Non-interactive re-init requires explicit overwrite confirmation
- **WHEN** 用户在已有 `.imwel` 的目录以非交互方式运行 `imwel init` 并提供完整选择参数，但未带覆盖确认
- **THEN** CLI SHALL 报告已有绑定，SHALL NOT 覆盖 `.imwel` 或重装制品，并以非零退出码退出
