# Contributing to Better Query

Thank you for your interest in contributing to Better Query! This guide will help you understand our development and release process.

## Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/armelgeek/better-query.git
   cd better-query
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Build packages**
   ```bash
   pnpm build
   ```

4. **Start development mode**
   ```bash
   pnpm dev
   ```

## Making Changes

### Standard Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Edit code in `packages/better-query/` or `packages/better-admin/`
   - Add tests if applicable
   - Update documentation if needed

3. **Run tests and linting**
   ```bash
   pnpm test
   pnpm lint
   pnpm typecheck
   ```

4. **Create a changeset**
   ```bash
   pnpm changeset
   ```
   
   This will prompt you to:
   - Select which package(s) changed
   - Choose the version bump type (major/minor/patch)
   - Write a description of your changes

5. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

6. **Push and create a Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```

## Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` - A new feature
- `fix:` - A bug fix
- `docs:` - Documentation only changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:
```bash
git commit -m "feat: add PostgreSQL connection pooling"
git commit -m "fix: resolve query builder type inference issue"
git commit -m "docs: update installation instructions"
```

## Changeset Guidelines

### When to Create a Changeset

Create a changeset for:
- ✅ New features
- ✅ Bug fixes
- ✅ Breaking changes
- ✅ Performance improvements
- ✅ Any change that affects package users

Don't create a changeset for:
- ❌ Documentation updates (unless they reflect code changes)
- ❌ Internal refactoring (if no user-facing impact)
- ❌ Build configuration changes
- ❌ Test updates

### Version Bump Guidelines

**Major (Breaking Changes)**
```bash
pnpm changeset
# Select: major
# Example: "Rename betterQuery() to createQuery()"
```

**Minor (New Features)**
```bash
pnpm changeset
# Select: minor
# Example: "Add support for MongoDB adapter"
```

**Patch (Bug Fixes)**
```bash
pnpm changeset
# Select: patch
# Example: "Fix connection pool leak in PostgreSQL adapter"
```

## Release Process

The release process is automated via GitHub Actions:

1. **Your PR with changeset is merged** → Changes are in `master`
2. **GitHub Actions creates a "Version Packages" PR** → Shows version bumps and changelog
3. **Maintainer merges Version PR** → Packages are automatically published to npm

See [RELEASE.md](./RELEASE.md) for detailed information about the release process.

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for a specific package
cd packages/better-query
pnpm test

# Run tests in watch mode
pnpm test -- --watch
```

### Writing Tests

- Place tests in `__tests__` directories or alongside source files with `.test.ts` extension
- Use Vitest for testing
- Follow existing test patterns in the codebase

## Package Structure

```
packages/
├── better-query/          # CRUD generator and API framework
│   ├── src/
│   │   ├── index.ts       # Main entry point
│   │   ├── client.ts      # Client SDK
│   │   ├── adapters/      # Database adapters
│   │   ├── cli/           # CLI tool
│   │   └── plugins/       # Plugin system
│   ├── CHANGELOG.md       # Auto-generated changelog
│   └── package.json
│
├── better-admin/          # Admin UI CLI
│   ├── src/
│   │   ├── index.ts       # Main entry point
│   │   ├── cli/           # CLI tool
│   │   └── registry/      # Component registry
│   ├── CHANGELOG.md       # Auto-generated changelog
│   └── package.json
│
└── shared/                # Shared utilities (not published)
```

## Documentation

### Updating Documentation

- Main docs are in `docs/` directory
- Package-specific READMEs are in each package directory
- Update docs when adding new features or changing APIs

### Documentation Standards

- Use clear, concise language
- Include code examples
- Add TypeScript types where applicable
- Test code examples to ensure they work

## Code Style

We use [Biome](https://biomejs.dev/) for linting and formatting:

```bash
# Check code style
pnpm lint

# Auto-fix code style issues
pnpm lint:fix

# Format code
pnpm format
```

### Style Guidelines

- Use tabs for indentation (configured in Biome)
- Prefer explicit types over `any`
- Use descriptive variable names
- Add JSDoc comments for exported functions
- Keep functions focused and small

## Getting Help

- 💬 **Discord**: Join our community (link in README)
- 🐛 **Issues**: Report bugs on GitHub Issues
- 💡 **Discussions**: Ask questions in GitHub Discussions
- 📧 **Email**: Contact maintainers (see package.json)

## Code of Conduct

Please be respectful and constructive in all interactions. We're building a welcoming community.

## License

By contributing to Better Query, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Better Query! 🚀
