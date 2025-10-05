# Setup Checklist for Maintainers

This checklist will help you get the automated release system up and running.

## Prerequisites

- [ ] npm account with publish rights to `better-query` and `better-admin`
- [ ] Admin access to GitHub repository
- [ ] Packages ready to publish (built and tested)

## Step 1: NPM Token Setup (Required)

- [ ] Log in to https://www.npmjs.com/
- [ ] Go to Account Settings → Access Tokens
- [ ] Click "Generate New Token" → Select "Automation" type
- [ ] Copy the token (starts with `npm_`)
- [ ] Go to GitHub repository Settings → Secrets and variables → Actions
- [ ] Click "New repository secret"
- [ ] Name: `NPM_TOKEN`, Value: paste your token
- [ ] Click "Add secret"

**Documentation:** See `NPM_SETUP.md` for detailed instructions with screenshots.

## Step 2: Verify Package Names

- [ ] Check you can publish to these packages:
  ```bash
  npm owner ls better-query
  npm owner ls better-admin
  ```

- [ ] If packages don't exist, you'll need to publish the first version manually:
  ```bash
  cd packages/better-query && npm publish --access public
  cd ../better-admin && npm publish --access public
  ```

## Step 3: Test the Workflow

- [ ] Create a test branch:
  ```bash
  git checkout -b test-release-workflow
  ```

- [ ] Make a small change (e.g., update README)

- [ ] Create a changeset:
  ```bash
  pnpm changeset
  # Select: better-query (patch)
  # Description: "Test automated release workflow"
  ```

- [ ] Commit and push:
  ```bash
  git add .
  git commit -m "test: verify release workflow"
  git push origin test-release-workflow
  ```

- [ ] Create a Pull Request

- [ ] Merge the PR to `master`

- [ ] Wait 1-2 minutes for GitHub Actions to run

- [ ] Check for "Version Packages" PR:
  - [ ] PR should be automatically created
  - [ ] Should show version bump (e.g., 0.0.1 → 0.0.2)
  - [ ] Should show updated CHANGELOGs

## Step 4: Complete First Release

- [ ] Review the "Version Packages" PR:
  - [ ] Check version numbers are correct
  - [ ] Review changelog entries
  - [ ] Verify both packages are listed

- [ ] Merge the "Version Packages" PR

- [ ] Wait for publish workflow to complete (2-3 minutes)

- [ ] Verify packages published:
  ```bash
  npm view better-query
  npm view better-admin
  ```

- [ ] Check npm registry:
  - [ ] Visit https://www.npmjs.com/package/better-query
  - [ ] Visit https://www.npmjs.com/package/better-admin

- [ ] Verify git tags created:
  ```bash
  git fetch --tags
  git tag -l
  ```

## Step 5: Team Communication

- [ ] Share documentation with team:
  - [ ] `WORKFLOW.md` - Visual overview
  - [ ] `RELEASE.md` - Complete process
  - [ ] `CONTRIBUTING.md` - For contributors
  - [ ] `QUICK_REFERENCE.md` - Quick commands

- [ ] Add to team wiki/docs:
  - [ ] Link to `CONTRIBUTING.md`
  - [ ] Explain changeset workflow
  - [ ] Share example PRs

- [ ] Update project README if needed

## Step 6: Monitor First Few Releases

- [ ] Watch GitHub Actions logs for first few releases
- [ ] Check npm downloads: https://npm-stat.com/
- [ ] Monitor for any publish errors
- [ ] Verify changelog updates correctly

## Common Issues & Solutions

### Issue: "NPM_TOKEN not found"
**Solution:** Verify secret is named exactly `NPM_TOKEN` (case-sensitive) in GitHub settings.

### Issue: "Permission denied" when publishing
**Solution:** 
1. Check you're a package owner: `npm owner ls PACKAGE_NAME`
2. If not, ask owner to add you: `npm owner add YOUR_USERNAME PACKAGE_NAME`

### Issue: Version PR not created
**Solution:**
1. Check changesets exist: `ls .changeset/*.md | grep -v README`
2. Check GitHub Actions enabled
3. Review workflow logs in Actions tab

### Issue: Publish fails with 2FA error
**Solution:** Use "Automation" token type (bypasses 2FA) instead of "Legacy" token.

## Maintenance Tasks

### Weekly
- [ ] Review open PRs with changesets
- [ ] Merge Version PRs promptly

### Monthly
- [ ] Check npm download statistics
- [ ] Review changelog quality
- [ ] Verify token still works

### Quarterly
- [ ] Consider rotating NPM_TOKEN
- [ ] Review and update documentation
- [ ] Check for changeset CLI updates

## Security Checklist

- [ ] NPM_TOKEN is "Automation" type (recommended)
- [ ] Token is stored in GitHub Secrets (not in code)
- [ ] Token has minimum required permissions
- [ ] 2FA enabled on npm account
- [ ] Regular token rotation schedule set

## Next Steps After Setup

1. **Share with contributors:**
   - Point them to `CONTRIBUTING.md`
   - Explain changeset workflow in onboarding

2. **Document in wiki:**
   - Add release process to team wiki
   - Link to these docs

3. **Set expectations:**
   - Define release schedule (weekly, bi-weekly, etc.)
   - Clarify who can merge Version PRs

4. **Monitor and improve:**
   - Collect feedback from team
   - Update docs based on questions
   - Refine process as needed

## Success Criteria

✅ NPM_TOKEN configured and working
✅ Test release completed successfully
✅ Packages visible on npm registry
✅ Changelogs auto-generated correctly
✅ Team understands the workflow
✅ Documentation accessible to all

## Support

If you encounter any issues:

1. Check `NPM_SETUP.md` for detailed troubleshooting
2. Review GitHub Actions logs
3. Check npm registry status: https://status.npmjs.org/
4. Consult Changesets docs: https://github.com/changesets/changesets

## Rollback Plan (if needed)

If something goes wrong:

1. **Unpublish recent version** (within 72 hours):
   ```bash
   npm unpublish better-query@VERSION
   npm unpublish better-admin@VERSION
   ```

2. **Revert git tags:**
   ```bash
   git tag -d VERSION_TAG
   git push origin :refs/tags/VERSION_TAG
   ```

3. **Fix the issue and re-release**

---

**Note:** Keep this checklist for future reference. Update it as you learn what works best for your team.

Last updated: 2024
