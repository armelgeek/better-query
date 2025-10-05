# Setting Up NPM Publishing

This guide will help you configure the repository for automated npm publishing.

## Prerequisites

1. **npm Account**: You need an account on [npmjs.com](https://www.npmjs.com/)
2. **Publishing Rights**: You must have publish rights for the `better-query` and `better-admin` packages
3. **GitHub Repository Access**: Admin access to configure repository secrets

## Step 1: Create an npm Access Token

1. **Log in to npm**
   - Go to https://www.npmjs.com/
   - Sign in to your account

2. **Navigate to Access Tokens**
   - Click on your profile icon (top right)
   - Select "Access Tokens"
   - Or go directly to: https://www.npmjs.com/settings/YOUR_USERNAME/tokens

3. **Generate New Token**
   - Click "Generate New Token"
   - Select "Automation" token type (recommended for CI/CD)
   - Give it a descriptive name like "GitHub Actions - better-query"
   - Click "Generate Token"

4. **Copy the Token**
   - **Important**: Copy the token immediately - you won't be able to see it again!
   - The token looks like: `npm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Step 2: Add Token to GitHub Secrets

1. **Navigate to Repository Settings**
   - Go to your GitHub repository: https://github.com/armelgeek/better-query
   - Click "Settings" tab

2. **Access Secrets**
   - In the left sidebar, click "Secrets and variables" → "Actions"

3. **Add New Secret**
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Paste your npm token
   - Click "Add secret"

## Step 3: Verify Package Names

Ensure you have rights to publish to these packages:

```bash
npm owner ls better-query
npm owner ls better-admin
```

If the packages don't exist yet, you'll need to publish the first version manually:

```bash
# From repository root
pnpm build

# Publish better-query
cd packages/better-query
npm publish --access public

# Publish better-admin
cd ../better-admin
npm publish --access public
```

## Step 4: Test the Workflow

After setting up the `NPM_TOKEN` secret:

1. **Create a test changeset**:
   ```bash
   pnpm changeset
   ```

2. **Commit and push**:
   ```bash
   git add .
   git commit -m "test: add test changeset"
   git push origin your-branch
   ```

3. **Merge to master**: When your PR is merged, the workflow will:
   - Detect the changeset
   - Create a "Version Packages" PR
   - Show the version bumps and changelog updates

4. **Merge Version PR**: When the Version PR is merged:
   - Packages will be built
   - Published to npm
   - Git tags created

## Troubleshooting

### Error: "Unable to authenticate"

**Problem**: npm authentication failed

**Solutions**:
1. Verify `NPM_TOKEN` is correctly set in GitHub secrets
2. Check token hasn't expired (tokens don't expire for automation tokens)
3. Ensure token has publish permissions
4. Try generating a new token

### Error: "You do not have permission to publish"

**Problem**: Account doesn't have publish rights

**Solutions**:
1. Check if you're a member of the npm organization
2. Request publish access from package owner:
   ```bash
   npm owner add YOUR_USERNAME better-query
   npm owner add YOUR_USERNAME better-admin
   ```

### Error: "Package name already exists"

**Problem**: Package names are taken

**Solutions**:
1. Check if you own the packages: `npm owner ls PACKAGE_NAME`
2. If owned by someone else, choose different names
3. Use scoped packages: `@your-org/better-query`

### Workflow doesn't trigger

**Problem**: Release workflow doesn't run

**Check**:
1. Verify workflow file is in `.github/workflows/release.yml`
2. Check GitHub Actions is enabled for the repository
3. Verify you're pushing to `master` branch
4. Check there are changesets in `.changeset/` directory

## Security Best Practices

1. **Use Automation Tokens**: These are designed for CI/CD and don't expire
2. **Rotate Tokens Regularly**: Consider rotating tokens every 6-12 months
3. **Limit Token Scope**: Only use tokens for the specific packages needed
4. **Monitor Usage**: Regularly check npm access logs for unusual activity
5. **Use Organization Tokens**: If publishing under an org, use org tokens

## Additional Configuration

### Two-Factor Authentication (2FA)

If you have 2FA enabled on npm:

1. **For Automation tokens**: These bypass 2FA requirement - this is why they're recommended
2. **For Legacy tokens**: You'll need to configure 2FA in the workflow (not recommended)

### Publishing to Private Registry

To publish to a different registry (e.g., GitHub Packages):

1. Update workflow's `registry-url`:
   ```yaml
   - name: Setup Node.js
     uses: actions/setup-node@v4
     with:
       node-version: '18'
       registry-url: 'https://npm.pkg.github.com'
   ```

2. Use `GITHUB_TOKEN` instead of `NPM_TOKEN`

### Custom Publish Command

If you need custom publish options, update `package.json`:

```json
{
  "scripts": {
    "changeset:publish": "pnpm build && changeset publish --tag beta"
  }
}
```

## Next Steps

After successful setup:

1. Read [RELEASE.md](./RELEASE.md) for the complete release process
2. Review [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines
3. Create your first changeset and test the workflow

## Support

If you encounter issues:

- 📖 Check [Changesets documentation](https://github.com/changesets/changesets)
- 💬 Ask in GitHub Discussions
- 🐛 Report bugs in GitHub Issues
- 📧 Contact maintainers

---

Last updated: 2024
