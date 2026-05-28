import { createFileRoute } from "@tanstack/react-router";
import { CategoryPage } from "@/components/sanadak/CategoryPage";
import { HallsSection } from "@/components/sanadak/CategoriesShowcase";

export const Route = createFileRoute("/halls")({
  head: () => ({ meta: [{ title: "قاعات الأفراح · سندك" }, { name: "description", content: "أفخم قاعات الأفراح في القاهرة والإسكندرية والجيزة" }] }),
  component: () => (
    <CategoryPage titleKey="cat_halls" descKey="cat_halls_desc" badge="04">
      {(q) => <HallsSection query={q} />}
    </CategoryPage>
  ),
});
