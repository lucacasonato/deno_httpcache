import { redisCache } from "./redis.ts";
import { assert, assertEquals } from "./test_deps.ts";

Deno.test("[redis] cache, retrieve, delete", async () => {
  const cache = await redisCache("redis://127.0.0.1:6379", "cache-");
  try {
    const originalResp = new Response("Hello World", {
      status: 200,
      headers: {
        "server": "deno",
        "cache-control": "public, max-age=604800, immutable",
      },
    });

    await cache.put("https://deno.land", originalResp);

    const cachedResp = await cache.match("https://deno.land");
    assert(cachedResp);
    assertEquals(originalResp.status, cachedResp.status);
    assertEquals(
      originalResp.headers.get("server"),
      cachedResp.headers.get("server"),
    );
    assertEquals(await cachedResp.text(), "Hello World");

    await cache.delete("https://deno.land");

    const otherCachedResp = await cache.match("https://deno.land");
    assert(otherCachedResp === undefined);
  } finally {
    cache.close();
  }
});
