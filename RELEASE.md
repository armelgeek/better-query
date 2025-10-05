# Release Process

This document describes the automated release and publishing process for the Better Query packages.

## Overview

We use [Changesets](https://github.com/changesets/changesets) to manage versioning and publishing of our packages. This allows us to:

- Automatically version packages based on changes
- Generate changelogs automatically
- Publish to npm with a single command or via GitHub Actions
- Maintain version history and release notes

## Workflow

### 1. Making Changes

When you make changes to `better-query` or `better-admin`:

1. Make your code changes
2. Create a changeset to describe your changes:

```bash
pnpm changeset
```

This will prompt you to:
- Select which packages changed
- Select the type of change (major, minor, patch)
- Provide a description of the changes

The changeset will be saved in `.changeset/` directory as a markdown file.

### 2. Version Bump Types

Follow [Semantic Versioning](https://semver.org/):

- **Major** (1.0.0 → 2.0.0): Breaking changes
- **Minor** (1.0.0 → 1.1.0): New features (backward compatible)
- **Patch** (1.0.0 → 1.0.1): Bug fixes

### 3. Automated Release (via GitHub Actions)

The release process is fully automated:

1. **Merge PR to master**: When a PR with changesets is merged to `master`, the GitHub Actions workflow runs
2. **Version PR Creation**: If there are changesets, a "Version Packages" PR is automatically created
3. **Merge Version PR**: When you merge the Version PR:
   - Package versions are bumped
   - CHANGELOGs are updated
   - Packages are published to npm
   - Git tags are created

### 4. Manual Release (Optional)

You can also release manually:

```bash
# Build packages
pnpm build

# Update versions and changelogs
pnpm changeset:version

# Review the changes, then commit them
git add .
git commit -m "chore: version packages"

# Publish to npm
pnpm changeset:publish

# Push tags
git push --follow-tags
```

## GitHub Actions Setup

The release workflow is defined in `.github/workflows/release.yml`. It requires:

### Required Secrets

Add these secrets in your GitHub repository settings (Settings → Secrets and variables → Actions):

1. **NPM_TOKEN**: Your npm authentication token
   - Go to https://www.npmjs.com/settings/[your-username]/tokens
   - Create a new "Automation" token
   - Add it as `NPM_TOKEN` in GitHub secrets

## Package Configuration

Both `better-query` and `better-admin` packages are configured to:

- Publish with public access (`publishConfig.access: "public"`)
- Include `CHANGELOG.md` and `README.md` in published package
- Follow semantic versioning

## Examples

### Example: Adding a New Feature

```bash
# 1. Make your changes
# ... code changes ...

# 2. Create a changeset
pnpm changeset
# Select: better-query (space to select, enter to confirm)
# Select: minor (new feature)
# Description: "Add support for MongoDB adapter"

# 3. Commit everything including the changeset
git add .
git commit -m "feat: add MongoDB adapter support"

# 4. Push and create PR
git push origin feature-branch
```

### Example: Fixing a Bug

```bash
# 1. Make your changes
# ... code changes ...

# 2. Create a changeset
pnpm changeset
# Select: better-admin
# Select: patch (bug fix)
# Description: "Fix component installation path resolution"

# 3. Commit and push
git add .
git commit -m "fix: resolve component installation paths correctly"
git push origin fix-branch
```

## Changelog Format

Changelogs are automatically generated in the following format:

```markdown
# Changelog

## [1.1.0] - 2024-01-15

### Added
- Add support for MongoDB adapter

### Fixed
- Fix component installation path resolution

## [1.0.0] - 2024-01-01
...
```

## Troubleshooting

### Workflow fails with "npm publish" error

- Check that `NPM_TOKEN` is correctly set in GitHub secrets
- Verify the token has publish permissions
- Check that the package name isn't already taken on npm

### Changeset not detected

- Make sure you committed the changeset file (`.changeset/*.md`)
- Check that the changeset file is in the correct format

### Version PR not created

- Ensure there are changesets in the `.changeset/` directory
- Check the GitHub Actions logs for errors
- Verify the workflow has the correct permissions

## Best Practices

1. **Always create a changeset** for user-facing changes
2. **Write clear changeset descriptions** - they become part of the changelog
3. **Group related changes** in the same PR when possible
4. **Review the Version PR carefully** before merging - it shows exactly what will be released
5. **Don't manually edit CHANGELOGs** - they're generated automatically

## References

- [Changesets Documentation](https://github.com/changesets/changesets/blob/main/docs/intro-to-using-changesets.md)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
