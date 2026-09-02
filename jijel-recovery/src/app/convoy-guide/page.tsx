import { redirect } from "next/navigation";

type ConvoyGuidePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ConvoyGuidePage({
  searchParams,
}: ConvoyGuidePageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      query.set(key, value);
    } else if (Array.isArray(value)) {
      for (const entry of value) {
        query.append(key, entry);
      }
    }
  }

  const suffix = query.toString();
  redirect(suffix ? `/guide?${suffix}` : "/guide");
}
