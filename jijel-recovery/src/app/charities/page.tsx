import { getCharityInventories } from "@/actions/charity-inventory";
import CharityInventoryView from "@/components/charity/CharityInventoryView";

type CharitiesPageProps = {
  searchParams: Promise<{ commune?: string }>;
};

export default async function CharitiesPage({ searchParams }: CharitiesPageProps) {
  const params = await searchParams;
  const initialCommune = params.commune?.trim() ?? "";
  const result = await getCharityInventories({
    availability: "in_stock",
    commune: initialCommune || undefined,
  });

  return (
    <main>
      <CharityInventoryView
        initialItems={result.success ? (result.data ?? []) : []}
        initialCommune={initialCommune}
      />
    </main>
  );
}
