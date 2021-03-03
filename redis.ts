import { connect, parseURL } from "https://deno.land/x/redis@v0.19.0/mod.ts";
import {
  decode,
  encode,
} from "https://deno.land/std@0.89.0/encoding/base64.ts";
import { Cache } from "./mod.ts";
export { Cache };

export async function redisCache(
  databaseUrl: string,
  prefix = "",
): Promise<Cache> {
  const conn = await connect(parseURL(databaseUrl));
  return new Cache({
    async get(url) {
      const bulk = await conn.get(prefix + url);
      if (!bulk) return undefined;
      const [policyBase64, bodyBase64] = bulk.split("\n");
      const policy = JSON.parse(atob(policyBase64));
      const body = decode(bodyBase64);
      return { policy, body };
    },
    async set(url, resp) {
      const policyBase64 = btoa(JSON.stringify(resp.policy));
      const bodyBase64 = encode(resp.body);
      // TODO(lucacasonato): add ttl
      await conn.set(prefix + url, `${policyBase64}\n${bodyBase64}`);
    },
    async delete(url) {
      await conn.del(prefix + url);
    },
    close() {
      conn.close();
    },
  });
}
