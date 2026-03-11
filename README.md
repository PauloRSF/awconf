# awconf ⚙️

Type-safe, validation-agnostic configuration loader for Node.js.

You can load configuration values from environment variables, `.env` files, JSON files or your own custom sources, validate them and parse them into a fully typed object.

You can use multiple config sources to use fallback values or multiple layers of configuration overrides.

## Features

- **Multiple sources** — env vars, `.env` files, JSON files or your own custom ones
- **Merge strategies** — control whether later sources override earlier ones (`last-wins`) or vice-versa (`first-wins`)
- **Validation-agnostic** — use plain functions, Zod, or write your own adapter
- **Error pooling** — all config errors are collected and reported at once, not one at a time
- **Type-safe** — the resolved config object is fully typed from your builder definition

## Packages

| Package | Description |
| --- | --- |
| `@awconf/core` | Core loader, built-in sources, and function-based config builder |
| `@awconf/zod` | Zod adapter — validate config values with Zod schemas |

## Quick Start

See each package's README to know how to get started with awconf.
