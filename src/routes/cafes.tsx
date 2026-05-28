import { createFileRoute } from "@tanstack/react-router";
import { CategoryPage } from "@/components/sanadak/CategoryPage";
import { CafesSection } from "@/components/sanadak/CategoriesShowcase";

export const Route = createFileRoute("/cafes")({
  head: () => ({ meta: [{ title: "الكافيهات · سندك" }, { name: "description", content: "كافيهات مصر · احجز طاولتك أو اطلب توصيل" }] }),
  component: () => (
    <CategoryPage titleKey="cat_cafes" descKey="cat_cafes_desc" badge="02">
      {(q) => <CafesSection query={q} />}
    </CategoryPage>
  ),
});
