# Better Query 🚀

> **A powerful, type-safe toolkit for building modern web applications**

Better Kit is a comprehensive TypeScript monorepo containing production-ready libraries for CRUD operations, admin interfaces, and more. Built with developer experience and type safety in mind.

## 📦 Packages

| Package | Description | Version | Status |
|---------|-------------|---------|--------|
| [**better-query**](./packages/better-query) | Type-safe CRUD generator with auto-generated REST APIs | `0.0.1` | 🚧 Beta |
| [**shared**](./packages/shared) | Shared utilities and types | `0.0.1` | 🚧 Beta |

## ✨ Key Features

### 🎯 **Better Query** - CRUD Made Simple
```typescript
import { betterQuery, createResource } from 'better-query';

const query = betterQuery({
  database: { provider: "sqlite", url: "./data.db" },
  resources: [
    createResource({
      name: "user",
      schema: z.object({
        name: z.string(),
        email: z.string().email(),
      })
    })
  ]
});

// Auto-generated API endpoints:
// GET    /api/query/user     - List users
// POST   /api/query/user     - Create user  
// GET    /api/query/user/:id - Get user
// PUT    /api/query/user/:id - Update user  
// DELETE /api/query/user/:id - Delete user
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm

### Installation
```bash
# Clone the repository
git clone https://github.com/armelgeek/better-query.git
cd better-query

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Try the Examples
```bash
# Run the Next.js demo
cd dev/next-app
pnpm install
pnpm dev
```

## 📚 Documentation

- 📖 **[Better Query Docs](./packages/better-query/README.md)** - CRUD operations and API generation
- 📋 **[Complete Documentation](./documentation/README.md)** - Comprehensive guides
- 💡 **[Examples](./examples/)** - Working code examples
- 🎯 **[TODO List](./TODO.md)** - Planned improvements and features

## 🛠️ Development

### Project Structure
```
better-query/
├── packages/
│   ├── better-query/     # CRUD generator core
│   └── shared/           # Shared utilities
├── dev/                  # Development apps
│   ├── next-app/         # Next.js example
│   └── bun/              # Bun runtime example
├── docs/                 # Documentation site
├── examples/             # Code examples
└── documentation/        # Comprehensive docs
```

### Available Scripts
```bash
# Development
pnpm dev          # Start all packages in watch mode
pnpm build        # Build all packages
pnpm test         # Run tests
pnpm lint         # Lint code
pnpm typecheck    # Type checking

# Maintenance
pnpm clean        # Clean build artifacts
pnpm release      # Release new version
```

### Contributing
```bash
# Fork the repo and clone your fork
git clone https://github.com/YOUR_USERNAME/better-query.git

# Create a branch for your changes
git checkout -b feature/your-feature-name

# Make your changes and test them
pnpm build
pnpm test

# Submit a pull request
```

## 🎯 Use Cases

### Perfect For:
- **SaaS Applications** - Multi-tenant CRUD operations
- **Admin Dashboards** - Data management interfaces  
- **Content Management** - Blog, CMS, e-commerce
- **API Development** - Rapid REST API creation
- **Prototyping** - Quick proof-of-concept development

### Architecture Support:
- ✅ **Full-Stack React** (Next.js, Vite)
- ✅ **API-First** (Express, Fastify, Hono)
- ✅ **Database Agnostic** (PostgreSQL, MySQL, SQLite)
- ✅ **TypeScript Native** - End-to-end type safety
- ✅ **Plugin Architecture** - Extensible functionality

## 🗄️ Database Support

| Database | Status | Adapter |
|----------|--------|---------|
| **PostgreSQL** | ✅ Production | `postgresql://` |
| **MySQL** | ✅ Production | `mysql://` |
| **SQLite** | ✅ Production | `./database.db` |
| **MongoDB** | 🚧 Planned | - |
| **Supabase** | 🚧 Planned | - |

## 🔌 Plugin Ecosystem

### Built-in Plugins
- **🔍 Audit Plugin** - Track all data changes
- **✅ Validation Plugin** - Enhanced data validation  
- **⚡ Cache Plugin** - Multi-level caching
- **📊 OpenAPI Plugin** - Auto-generated API docs
- **📤 Upload Plugin** - File upload with multiple storage backends

### Third-Party Integrations (Planned)
- **🔐 Better Auth** - Authentication system
- **☁️ Cloud Storage** - S3, Cloudinary integration
- **📧 Email** - Transactional email sending
- **🔍 Search** - Elasticsearch, Algolia

## 📈 Roadmap

### ✅ Current (v0.0.1)
- Core CRUD operations
- Basic admin components  
- Database adapters
- Plugin system foundation
- File upload support

### 🚧 Next (v0.1.0)
- Complete admin component library
- Better Auth integration
- Enhanced documentation
- Cloud storage integrations

### 🎯 Future (v1.0.0)
- Production stability
- Performance optimizations
- Comprehensive testing
- Plugin marketplace

## 🤝 Community

- **💬 Discussions** - [GitHub Discussions](https://github.com/armelgeek/better-query/discussions)
- **🐛 Issues** - [Bug Reports](https://github.com/armelgeek/better-query/issues)
- **📝 Contributing** - [Contribution Guide](./CONTRIBUTING.md)
- **📄 License** - [MIT License](./LICENSE)

## ⚠️ Current Status

**⚠️ ALPHA SOFTWARE**: Better Kit is in active development. APIs may change. Use in production with caution.

### Known Issues
- [ ] Build system needs dependency fixes
- [ ] Some examples need updates
- [ ] Documentation gaps exist
- [ ] Test coverage incomplete

See [TODO.md](./TODO.md) for complete status and [ACTION_PLAN.md](./ACTION_PLAN.md) for immediate improvements.

---

**Ready to build something amazing?** Start with our [Quick Start Guide](./packages/better-query/README.md) or explore the [examples](./examples/).

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![Build Status](https://img.shields.io/badge/build-in%20progress-orange.svg)]()