# deno_httpcache

HTTP Caching for Deno - in memory and redis storage support. Inspired by the
Service Worker Cache API.

## Usage

Setting, getting, and deleting items in the cache:

```ts
import { inMemoryCache } from "https://deno.land/x/httpcache@0.1.1/in_memory.ts";

const cache = inMemoryCache(5);

const req = new Request("https://deno.land/std@0.89.0/version.ts");
const resp = await fetch(req);

await cache.set(req, resp);

const cachedResp = await cache.get(req); // or `cache.get(req.url)`
if (cachedResp === undefined) throw new Error("Response not found in cache");
console.log(cachedResp.status); // 200
console.log(cachedResp.headers.get("content-type")); // application/typescript; charset=utf-8

await cache.remove(req); // or `cache.remove(req.url)`
console.log(await cache.get(req)); // undefined
```

And with redis:

```ts
import { redisCache } from "https://deno.land/x/httpcache@0.1.1/redis.ts";

const cache = await redisCache("redis://127.0.0.1:6379");

// you can also optionally specify a prefix to use for the cache key:
const cache = await redisCache("redis://127.0.0.1:6379", "v1-");
```

## Contributing

Before submitting a PR, please run these three steps and check that they pass.

1. `deno fmt`
2. `deno lint --unstable`
3. `deno test --allow-net` _this requires you to have a redis server running at
   127.0.0.1:6379_
