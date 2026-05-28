import { createFileRoute } from "@tanstack/react-router";
import { CategoryPage } from "@/components/sanadak/CategoryPage";
import { SuperSection } from "@/components/sanadak/CategoriesShowcase";

export const Route = createFileRoute("/super")({
  head: () => ({ meta: [{ title: "السوبرماركت · سندك" }, { name: "description", content: "خضار، فاكهة، لحوم، ومنتجات يومية — توصيل في ساعة" }] }),
  component: () => (
    <CategoryPage titleKey="cat_super" descKey="cat_super_desc" badge="05">
      {(q) => <SuperSection query={q} />}
    </CategoryPage>
  ),
});
