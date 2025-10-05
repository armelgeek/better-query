# Example Changeset

This is an example changeset file that demonstrates how to document changes for automated versioning and publishing.

## When to Use Changesets

Create a changeset when you make changes that should be included in the next release:

- ✅ New features
- ✅ Bug fixes  
- ✅ Breaking changes
- ✅ Performance improvements
- ✅ Any user-facing changes

## How This Works

1. When this changeset is merged to `master`, the GitHub Actions workflow detects it
2. A "Version Packages" PR is automatically created showing:
   - Version bumps (0.0.1 → 0.1.0 for minor changes)
   - Updated CHANGELOGs with the description from this file
3. When the Version PR is merged:
   - Package versions are updated
   - Packages are built and published to npm
   - Git tags are created
   - Release notes are generated

## Changeset File Format

```markdown
---
"package-name": patch | minor | major
---

Description of the changes that will appear in the CHANGELOG
```

## Example: This Changeset

This example changeset will:
- Bump both `better-query` and `better-admin` from `0.0.1` to `0.1.0` (minor version)
- Add the description to both package CHANGELOGs
- Trigger the automated publish workflow when merged

**Note:** This is a demonstration file. In practice, changesets are consumed (deleted) when versions are bumped, so you won't see this exact file after the Version PR is merged.
