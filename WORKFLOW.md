# Automated Release Workflow

## Visual Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                      DEVELOPER WORKFLOW                              │
└─────────────────────────────────────────────────────────────────────┘

1. Make Code Changes
   ├── Edit files in packages/better-query or packages/better-admin
   └── Run: pnpm build && pnpm test

2. Create Changeset
   └── Run: pnpm changeset
       ├── Select package(s): better-query, better-admin
       ├── Select type: patch | minor | major
       └── Write description (becomes changelog entry)

3. Commit & Push
   ├── git add .
   ├── git commit -m "feat: add new feature"
   └── git push origin feature-branch

4. Create Pull Request
   └── PR includes: code changes + .changeset/*.md file

┌─────────────────────────────────────────────────────────────────────┐
│                    AUTOMATED WORKFLOW                                │
└─────────────────────────────────────────────────────────────────────┘

5. PR Merged to Master
   └── Triggers: .github/workflows/release.yml

6. GitHub Actions Checks for Changesets
   ├── If changesets found:
   │   ├── Creates "Version Packages" PR
   │   ├── Shows version bumps (0.0.1 → 0.1.0)
   │   └── Shows updated CHANGELOGs
   └── If no changesets: workflow ends

7. Review Version PR
   ├── Check version numbers are correct
   ├── Review changelog entries
   └── Verify affected packages

8. Merge Version PR
   └── Triggers publishing workflow:
       ├── Builds all packages: pnpm build
       ├── Publishes to npm: changeset publish
       ├── Creates git tags: v0.1.0
       └── Deploys to npm registry

┌─────────────────────────────────────────────────────────────────────┐
│                          RESULT                                      │
└─────────────────────────────────────────────────────────────────────┘

9. Packages Published
   ├── better-query@0.1.0 on npm
   ├── better-admin@0.1.0 on npm
   ├── Updated CHANGELOGs in repository
   └── Git tags created for release

10. Users Can Install
    ├── npm install better-query@0.1.0
    └── npm install better-admin@0.1.0
```

## File Structure

```
better-query/
├── .changeset/
│   ├── config.json              # Changesets configuration
│   ├── example-*.md             # Example changeset (demo)
│   └── EXAMPLE.md               # Documentation
│
├── .github/workflows/
│   └── release.yml              # Automated publishing workflow
│
├── packages/
│   ├── better-query/
│   │   ├── CHANGELOG.md         # Auto-generated changelog
│   │   └── package.json         # Publishing metadata
│   └── better-admin/
│       ├── CHANGELOG.md         # Auto-generated changelog
│       └── package.json         # Publishing metadata
│
├── RELEASE.md                   # Detailed release guide
├── CONTRIBUTING.md              # Contribution guidelines
├── NPM_SETUP.md                 # NPM token setup
├── QUICK_REFERENCE.md           # Command cheat sheet
└── README.md                    # Project overview
```

## Version Bump Examples

### Patch (Bug Fix)
```
0.0.1 → 0.0.2

Changeset:
---
"better-query": patch
---
Fix query builder type inference
```

### Minor (New Feature)
```
0.0.1 → 0.1.0

Changeset:
---
"better-query": minor
---
Add support for MongoDB adapter
```

### Major (Breaking Change)
```
0.0.1 → 1.0.0

Changeset:
---
"better-query": major
---
BREAKING: Rename betterQuery() to createQuery()
```

### Multiple Packages
```
both: 0.0.1 → 0.1.0

Changeset:
---
"better-query": minor
"better-admin": minor
---
Add authentication plugin support
```

## Key Commands

| Command | Purpose |
|---------|---------|
| `pnpm changeset` | Create a new changeset |
| `pnpm changeset status` | View pending changesets |
| `pnpm changeset:version` | Update versions locally (test) |
| `pnpm changeset:publish` | Publish manually (if needed) |
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests |

## Success Indicators

✅ **Changeset Created**
- File exists in `.changeset/*.md`
- Committed to git

✅ **Version PR Created**
- PR title: "chore: version packages"
- Shows version bumps
- Shows changelog updates

✅ **Published Successfully**
- Packages visible on npm
- Git tags created
- Changelog updated in repo

## Common Scenarios

### Scenario 1: Bug Fix in better-query
```bash
# Fix bug
pnpm changeset  # Select: better-query, patch
git commit -m "fix: resolve connection leak"
# Result: better-query 0.0.1 → 0.0.2
```

### Scenario 2: New Feature in both packages
```bash
# Add feature
pnpm changeset  # Select: both, minor
git commit -m "feat: add real-time updates"
# Result: both 0.0.1 → 0.1.0
```

### Scenario 3: Breaking Change
```bash
# Make breaking change
pnpm changeset  # Select: better-query, major
git commit -m "feat!: new API structure"
# Result: better-query 0.1.0 → 1.0.0
```

## Troubleshooting Quick Reference

| Issue | Solution |
|-------|----------|
| No Version PR | Check changesets exist in `.changeset/` |
| Publish fails | Verify `NPM_TOKEN` in GitHub secrets |
| Wrong version bump | Review changeset type (patch/minor/major) |
| Changelog missing entry | Check changeset description |

---

For detailed information, see:
- **RELEASE.md** - Complete workflow
- **CONTRIBUTING.md** - How to contribute
- **NPM_SETUP.md** - Setup instructions
