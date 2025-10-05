# Quick Reference: Release & Publishing

Quick commands for common release tasks.

## For Contributors

### Create a Changeset
```bash
pnpm changeset
```
Follow the prompts to select packages and describe changes.

### Common Changeset Types
- **Patch** (0.0.1 → 0.0.2): Bug fixes
- **Minor** (0.0.1 → 0.1.0): New features  
- **Major** (0.0.1 → 1.0.0): Breaking changes

## For Maintainers

### View Pending Changes
```bash
pnpm changeset status
```

### Test Version Bump Locally
```bash
pnpm changeset:version
```
This updates versions and CHANGELOGs but doesn't publish.

### Manual Publish (if needed)
```bash
# Build and publish
pnpm changeset:publish

# Push tags
git push --follow-tags
```

## Automated Workflow

When you merge a PR with changesets to `master`:

1. **GitHub Actions runs** → Creates "Version Packages" PR
2. **Review the Version PR** → Shows all version bumps
3. **Merge Version PR** → Packages published automatically

## Files to Know

| File | Purpose |
|------|---------|
| `.changeset/*.md` | Pending changes waiting to be released |
| `packages/*/CHANGELOG.md` | Auto-generated version history |
| `.github/workflows/release.yml` | Automation workflow |
| `RELEASE.md` | Full release documentation |
| `CONTRIBUTING.md` | Contribution guidelines |
| `NPM_SETUP.md` | NPM token setup |

## Troubleshooting

### No Version PR Created
- Check there are `.changeset/*.md` files
- Verify GitHub Actions is enabled
- Check workflow logs for errors

### Publish Failed
- Verify `NPM_TOKEN` secret is set
- Check package names aren't taken
- Review npm authentication

### Changeset Not Working
```bash
# Reinstall dependencies
pnpm install

# Check changeset config
cat .changeset/config.json
```

## Documentation

- 📘 **[RELEASE.md](./RELEASE.md)** - Complete release guide
- 👥 **[CONTRIBUTING.md](./CONTRIBUTING.md)** - How to contribute
- 🔑 **[NPM_SETUP.md](./NPM_SETUP.md)** - NPM publishing setup
- 📦 **[.changeset/EXAMPLE.md](./.changeset/EXAMPLE.md)** - Changeset example

## Package Versions

Current versions:
- `better-query`: 0.0.1
- `better-admin`: 0.0.1

Check latest: https://www.npmjs.com/package/better-query

---

**Need help?** Check the full docs or open an issue on GitHub.
