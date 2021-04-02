import type { S3Bucket } from "https://deno.land/x/s3@0.4.0/src/bucket.ts";
import { Cache } from "./mod.ts";
export { Cache };

/**
 * A durable cache good for storing diverse immutable bodies
 * for long periods of time.
 *
 * For most items the cache headers will be stored as S3 metadata.
 * This means the response body can be accessed without manipulation.
 * After the cache metadata for an item nears 2KiB,
 * it needs to instead be stored within the S3 object's body;
 * this shows up as a line of JSON text prepended to the payload
 * followed by a newline byte "\n"
 *
 * @param s3 Preconfigured S3 bucket API from /x/s3
 * @param prefix Optional prefix to be used for all S3 keys
 */

export function s3Cache(
  s3: S3Bucket,
  prefix = "",
): Cache {
  function urlKey(url: string) {
    return prefix + url.replace('://', '/') + '.cache';
  }
  return new Cache({

    async get(url) {
      const data = await s3.getObject(urlKey(url));
      if (!data) return undefined;

      if (data.meta['cache-policy'] === 'inline') {
        const body = new Uint8Array(await new Response(data.body).arrayBuffer());
        const idx = body.indexOf(10);
        return {
          policy: JSON.parse(new TextDecoder().decode(body.slice(0, idx))),
          body: body.slice(idx+1),
        };
      }

      return {
        policy: JSON.parse(data.meta['cache-policy'] || '{}'),
        body: new Uint8Array(await new Response(data.body).arrayBuffer()),
      };
    },

    async set(url, resp) {
      const list = resp.policy.resh['content-type'] ?? [];
      const contentType = Array.isArray(list) ? list[0] : list;

      const policy = JSON.stringify(resp.policy);
      if (policy.length > 1800) {
        const encodedPolicy = new TextEncoder().encode(policy);
        const body = new Uint8Array(encodedPolicy.length + 1 + resp.body.length);
        body.set(encodedPolicy, 0);
        body.set([10], encodedPolicy.length);
        body.set(resp.body, encodedPolicy.length + 1);

        await s3.putObject(urlKey(url), body, {
          contentType: contentType.startsWith('text/')
            ? 'text/x-httpcache'
            : 'binary/x-httpcache',
          meta: {
            ['cache-policy']: 'inline',
          },
        });
        return;
      }

      await s3.putObject(urlKey(url), resp.body, {
        contentType: contentType,
        meta: {
          ['cache-policy']: JSON.stringify(resp.policy),
        },
      });
    },

    async delete(url) {
      await s3.deleteObject(urlKey(url));
    },

    close() {},
  });
}
