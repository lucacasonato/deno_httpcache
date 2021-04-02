import { S3Bucket } from "https://deno.land/x/s3@0.4.0/mod.ts";
import { s3Cache } from "./s3.ts";
import { assert, assertEquals } from "./test_deps.ts";

const bucket = new S3Bucket({
  accessKeyID: Deno.env.get("AWS_ACCESS_KEY_ID")!,
  secretKey: Deno.env.get("AWS_SECRET_ACCESS_KEY")!,
  sessionToken: Deno.env.get('AWS_SESSION_TOKEN'),
  region: Deno.env.get("AWS_REGION") || "us-east-1",
  bucket: Deno.env.get("S3_BUCKET") || "test",
  endpointURL: Deno.env.get("S3_ENDPOINT_URL"),
});

Deno.test("[s3] cache, retrieve, delete", async () => {
  const cache = s3Cache(bucket, "tests-");

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
});

// Ensures that document tiers can be stored without conflicting
// Amazon S3 is fine with this overall; Minio is more problematic
Deno.test("[s3] flexible path hierachy", async () => {
  const cache = s3Cache(bucket, "tests-");

  function buildResp(text: string) {
    return new Response(text, {
      status: 200,
      headers: {
        "server": "deno",
        "cache-control": "public, max-age=604800, immutable",
      },
    });
  }

  await cache.put("https://deno.land/std/examples/welcome.ts", buildResp('Welcome'));
  await cache.put("https://deno.land/std/examples/", buildResp('Examples'));
  await cache.put("https://deno.land/std/", buildResp('std'));

  const cachedResp = await cache.match("https://deno.land/std/examples/");
  assert(cachedResp);
  assertEquals(await 'Examples', await cachedResp.text());
});
