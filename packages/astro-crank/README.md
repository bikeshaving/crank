# Astro Crank

An integration for Crank in Astro

## Installation

```shell
npm i astro-crank
```

Add the integration to `astro.config.mjs`.

```js
import {defineConfig} from "astro/config";
import crank from "astro-crank";

export default defineConfig({
  // ...
  integrations: [crank()],
});
```
