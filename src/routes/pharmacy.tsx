import { createFileRoute } from "@tanstack/react-router";
import { CategoryPage } from "@/components/sanadak/CategoryPage";
import { PharmacySection } from "@/components/sanadak/CategoriesShowcase";

export const Route = createFileRoute("/pharmacy")({
  head: () => ({ meta: [{ title: "الصيدليات · سندك" }, { name: "description", content: "أدوية، فيتامينات، ومستلزمات صحية — توصيل سريع ٢٤/٧" }] }),
  component: () => (
    <CategoryPage titleKey="cat_pharmacy" descKey="cat_pharmacy_desc" badge="06">
      {(q) => <PharmacySection query={q} />}
    </CategoryPage>
  ),
});
