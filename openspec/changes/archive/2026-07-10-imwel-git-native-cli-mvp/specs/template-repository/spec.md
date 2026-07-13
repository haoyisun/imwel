## ADDED Requirements

### Requirement: Manifest declares projects and directory conventions
A template repository SHALL declare its structure in a `.imwel/manifest.yaml` file at its root, containing a `conventions` section (default `rulesDir`, `skillsDir`, `agentsFile` names) and a `projects` list, where each project has a `name` and a `path` relative to the repository root, and MAY override `conventions` for itself.

#### Scenario: Reading a valid manifest
- **WHEN** the CLI reads a template repository whose `.imwel/manifest.yaml` declares two projects with different `rulesDir` overrides
- **THEN** the CLI SHALL resolve each project's effective conventions using its own override where present and the repository-level default otherwise

#### Scenario: Missing manifest
- **WHEN** the CLI attempts to use a repository that has no `.imwel/manifest.yaml`
- **THEN** the CLI SHALL report that the repository is not a valid imwel template repository and SHALL NOT proceed with binding

### Requirement: Optional artifacts are declared per project
A project entry in the manifest MAY declare an `optional` list of artifact paths. Artifacts not listed as optional SHALL be treated as required.

#### Scenario: Installing with optional artifacts present
- **WHEN** a project's manifest entry declares one artifact path under `optional`
- **THEN** the CLI SHALL prompt the user to include or exclude that artifact at install/sync time, while installing all non-optional artifacts automatically

### Requirement: Scaffolding a new template repository
`imwel template init` SHALL generate a new template repository skeleton containing a commented `.imwel/manifest.yaml`, an example project directory with a sample rule, a sample skill, and a sample `agents.md`, and a `README.md`/`CONTRIBUTING.md` describing how to add artifacts and how the push/propose contribution flow works.

#### Scenario: Scaffolding with default settings
- **WHEN** a user runs `imwel template init` and accepts the default prompts
- **THEN** the CLI SHALL write the full skeleton described above to the target directory without requiring any manual file creation

### Requirement: Scaffold content locale selection
`imwel template init` SHALL let the user choose the locale for generated comments and documentation (manifest comments, README, CONTRIBUTING), defaulting to the detected system locale and falling back to English if the detected locale has no matching scaffold template.

#### Scenario: Selecting a supported locale
- **WHEN** a user selects Simplified Chinese during `imwel template init`
- **THEN** the generated manifest comments and README/CONTRIBUTING content SHALL be written in Simplified Chinese

#### Scenario: Unsupported detected locale falls back to English
- **WHEN** the user's detected system locale has no corresponding scaffold template
- **THEN** the CLI SHALL generate the scaffold in English and SHALL NOT error out

### Requirement: Optional Git and hosting bootstrap during scaffold
`imwel template init` SHALL offer to initialize a local Git repository and create an initial commit, and, if the `gh` or `glab` CLI is detected and authenticated, SHALL offer to create the corresponding remote repository and push.

#### Scenario: Accepting Git bootstrap
- **WHEN** a user accepts the "initialize git and commit" prompt
- **THEN** the CLI SHALL run `git init` and create an initial commit containing the generated skeleton

#### Scenario: No hosting CLI available
- **WHEN** neither `gh` nor `glab` is available or authenticated
- **THEN** the CLI SHALL skip the remote-repository-creation offer without error and SHALL still complete local scaffolding
