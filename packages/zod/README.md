# @awconf/zod

Zod adapter for [`@awconf/core`](https://www.npmjs.com/package/@awconf/core) — validate config values with Zod schemas.

## Install

```bash
npm install @awconf/core @awconf/zod zod
```

## Quick Start

```typescript
import { resolveConfig, EnvironmentSource } from "@awconf/core";
import { configBuilder } from "@awconf/zod";

const config = await resolveConfig({
  mergeStrategy: "last-wins",
  sources: [EnvironmentSource()],
  builder: configBuilder(({ get, z }) => ({
    port: get("port", z.coerce.number().int().min(1).max(65535).default(3000)),
    host: get("host", z.string().default("0.0.0.0")),
    db: {
      url: get("database_url", z.string().url()),
      poolSize: get("db_pool_size", z.coerce.number().int().positive().default(10)),
    },
    env: get("node_env", z.enum(["development", "staging", "production"]).default("development")),
  })),
});
```
