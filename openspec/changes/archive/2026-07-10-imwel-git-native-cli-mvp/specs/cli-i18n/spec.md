## ADDED Requirements

### Requirement: Locale resolution order
The CLI SHALL resolve its interface locale in this order: an explicit `--lang` flag, then the `LANG`/`LC_ALL` environment variable, then English as the final fallback.

#### Scenario: Explicit flag takes precedence
- **WHEN** a user runs any `imwel` command with `--lang zh-CN` while their environment locale is set to English
- **THEN** the CLI SHALL display its interface in Simplified Chinese

#### Scenario: Falling back to English
- **WHEN** neither `--lang` nor a recognized `LANG`/`LC_ALL` value is present
- **THEN** the CLI SHALL display its interface in English

### Requirement: Per-locale string tables with per-key fallback
Interface strings SHALL be defined in per-locale string-table modules. If a specific key is missing in the resolved non-English locale, the CLI SHALL fall back to the English value for that key rather than producing a blank or broken string.

#### Scenario: Partial translation
- **WHEN** the resolved locale is `zh-CN` and a given message key has no Simplified Chinese translation yet
- **THEN** the CLI SHALL display the English text for that specific message while other, translated messages remain in Simplified Chinese

### Requirement: No hardcoded interface strings
User-facing CLI prompts, messages, and errors SHALL be defined only via the locale string-table lookup, not as inline string literals in command logic.

#### Scenario: Adding a new prompt
- **WHEN** a new interactive prompt is added to any command
- **THEN** its displayed text SHALL be sourced from the locale string table rather than a literal string in that command's code

### Requirement: Independence from scaffold template locale
The CLI interface locale (this capability) and the locale chosen for `imwel template init`'s generated scaffold content (covered by the template-repository capability) SHALL be selected independently; choosing one SHALL NOT change the other.

#### Scenario: Different locales for interface and scaffold
- **WHEN** a user's CLI interface locale is English but they select Simplified Chinese for the generated manifest comments during `imwel template init`
- **THEN** the CLI's own prompts SHALL remain in English while the generated scaffold content SHALL be in Simplified Chinese
