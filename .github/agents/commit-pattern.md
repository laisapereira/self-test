---
name: commit-conventional
description: Enforce Conventional Commits for git commit messages. Use when creating or rewriting commit messages, preparing commits for PRs, or validating commit message format (e.g., feat, fix, chore, docs, refactor, test, perf, build, ci, style, revert).
---

# Conventional Commits

Use Conventional Commits format:

<type>[optional scope]: <short summary>


Optional body and footer sections are allowed.

## Types
Use one of:
`feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`, `style`, `revert`.

## Scope
If useful, add scope in parentheses:
`feat(auth): add password login`

## Summary
- Use lowercase
- Imperative mood
- Keep concise (50-72 chars when possible)
- No trailing period

## Body (optional)
- Explain what and why, not how
- Wrap at ~72 chars

## Footer (optional)
- Use for breaking changes or issue references
- Breaking changes: `BREAKING CHANGE: <description>`

## Examples
- `feat(auth): add credentials provider`
- `fix(api): handle missing session`
- `chore(deps): update prisma`

## Workflow
When asked to commit:
1. Derive the correct `type` from the change.
2. Add a scope when it improves clarity.
3. Produce a full commit message in the Conventional Commits format.
4. If user provides their own message, rewrite it to match the forma
