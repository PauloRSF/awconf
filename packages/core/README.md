# @awconf/core

## Install

```bash
npm install @awconf/core
```

## Quick Start

```typescript
import { resolveConfig, EnvironmentSource, EnvironmentFileSource, configBuilder } from "@awconf/core";

const config = await resolveConfig({
  mergeStrategy: "last-wins",
  sources: [
    EnvironmentFileSource({ file: ".env", optional: true }),
    EnvironmentSource(),
  ],
  builder: configBuilder((c) => ({
    port: c.get("port", (raw) => (raw === undefined ? 3000 : Number(raw))),
    host: c.get("host", (raw) => (raw === undefined ? "0.0.0.0" : String(raw))),
  })),
});
```
