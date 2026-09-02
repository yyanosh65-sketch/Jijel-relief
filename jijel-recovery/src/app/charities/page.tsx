import { getCharityInventories } from "@/actions/charity-inventory";
import CharityInventoryView from "@/components/charity/CharityInventoryView";

export default async function CharitiesPage() {
  const result = await getCharityInventories({ availability: "in_stock" });

  return (
    <main>
      <CharityInventoryView initialItems={result.success ? (result.data ?? []) : []} />
    </main>
  );
}
