import { resolve } from "node:path";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  const { GET } = await import("../src/app/api/map-macro-stats/route");
  const wilayas = ["06_bejaia", "21_skikda", "19_setif", "18_jijel"] as const;

  for (const wilaya of wilayas) {
    const res = await GET(
      new Request(`http://localhost/api/map-macro-stats?wilaya=${wilaya}`),
    );
    const json = await res.json();
    console.log(wilaya, json);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
