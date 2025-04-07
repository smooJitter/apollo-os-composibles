# ApolloOS Framework

> A modular, functional-first GraphQL server framework built with Apollo Server v4, Mongoose, and GraphQL Compose — designed for personal and professional use.

---

## 📦 Features

- 🔌 Composable Module System — load any feature module with `App().load(module)`
- 🧠 Context-Aware Runtime — fully injectable `ctx`, with FP accessors and shared resources
- 🔧 GraphQL Compose Integration — automatic resolver mapping via `graphql-compose-mongoose`
- 🧰 Internal Utilities — local packages under `@apolloos/*` to support composition, error handling, schema config, and devtools
- 🛠️ Forge CLI — pluggable scaffolding tool for rapid module generation
- 🧪 Ramda & Sanctuary — functional tools for declarative composition and safe logic
- ⚙️ Workspace-Ready — built with `npm workspaces` for modular development

---

## 📁 Project Structure

```
apollo-os-framework/
├── core/                     # App kernel (App, ModuleLoader, Composer)
├── config/                   # Global config, enums, injectors, context
├── graphql/                  # Schema & middleware layer
├── forge/                    # CLI scaffolding engine (Plop-style)
├── packages/                 # Internal ApolloOS utilities (see below)
├── modules/                  # Empty; plug in your features
├── scripts/                  # Optional dev scripts
├── main.js                   # Apollo entry point
├── .env, .gitignore, README.md, package.json
```

---

## 🔢 Internal Workspace Packages

Each package lives under `packages/` and can be imported via `@apolloos/*`.

| Package                          | Purpose                                      |
| -------------------------------- | -------------------------------------------- |
| `@apolloos/module-utils`         | Composable module helpers                    |
| `@apolloos/schema-utils`         | Schema merge helpers for GCM + TC            |
| `@apolloos/resolver-utils`       | Secure, scoped resolver middleware           |
| `@apolloos/error-utils`          | Apollo-compliant error classes               |
| `@apolloos/graphql-config-utils` | Shared scalars, field wrappers, relations    |
| `@apolloos/plugin-utils`         | Apollo plugin composition (tracing, logging) |
| `@apolloos/devtools`             | Schema explorer + module meta extractor      |
| `@apolloos/testing-utils`        | Mocks for ctx, modules, resolvers            |
| `@apolloos/hooks` (optional)     | Lifecycle hooks registry                     |

---

## 🚀 Get Started

```bash
pnpm install     # or npm install
npm run dev      # run server with nodemon
npm run forge    # run Forge CLI to generate modules
```

---

## ✨ Forge CLI

Scaffold modules and features using:

```bash
node forge/forge.js
```

Default templates exist under `forge/templates/module/`.

---

## 🧩 Building Modules

1. Create a folder under `modules/your-feature`
2. Include `model/`, `typeComposer/`, `actions/`, `resolvers/`, etc.
3. Export from `index.js`:

```js
export default function(ctx) {
  return {
    id: 'your-feature',
    models: { ... },
    typeComposers: { ... },
    onLoad: () => { ... }
  };
}
```

ApolloOS will auto-load it into schema and runtime.

---

## 🧠 Philosophy

ApolloOS is designed to feel like:

- A backend **operating system**
- With **safe functional primitives**
- And **maximum flexibility** in how you compose your features

---

## 🧰 Tools Used

- Apollo Server v4
- GraphQL Compose
- Mongoose
- Ramda
- Sanctuary
- Zod
- Nodemon
- ESLint
- Plop (Forge)

---

## ✅ Status

This is a personal-use framework scaffolded for local development.  
It's workspace-enabled and pluggable — you bring the features, it brings the engine.

---

ApolloOS is now your developer sanctuary.  
Start composing.
