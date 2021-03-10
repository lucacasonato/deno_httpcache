import { inMemoryCache } from "./in_memory.ts";
import { assert, assertEquals } from "./test_deps.ts";

Deno.test("[in memory] cache, retrieve, delete", async () => {
  const cache = inMemoryCache(5);
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
    assertEquals(await originalResp.text(), await cachedResp.text());

    await cache.delete("https://deno.land");

    const otherCachedResp = await cache.match("https://deno.land");
    assert(otherCachedResp === undefined);
  } finally {
    cache.close();
  }
});
