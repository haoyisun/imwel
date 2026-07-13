# Security Policy

## Supported versions

Security fixes are applied to the latest published release on npm when feasible. Older versions may not receive backports.

## Reporting a vulnerability

imwel is a **local CLI with no backend**. Still report issues that could affect users’ machines, credentials, or supply chain (for example: unsafe file writes, command injection via crafted remotes/manifests, compromised publish credentials, or malicious dependency behavior).

**Please do not open a public GitHub Issue for undisclosed vulnerabilities.**

Preferred channel:

1. Use [GitHub Private Vulnerability Reporting](https://github.com/haoyisun/imwel/security/advisories/new) on this repository (enable **Private vulnerability reporting** in repository settings if it is not already on).
2. If Advisories are unavailable, contact the repository maintainers privately via GitHub (maintainer contact on the [repository](https://github.com/haoyisun/imwel) page) and wait for acknowledgment before public discussion.

Include: affected version, reproduction steps, impact, and any suggested fix.

## Scope notes

- No hosted service or user accounts are operated by this project.
- Supply-chain concerns (npm package integrity, GitHub Actions secrets, dependency updates) are in scope.
- Social-engineering or phishing against individual users is generally out of scope unless tied to a defect in imwel itself.
