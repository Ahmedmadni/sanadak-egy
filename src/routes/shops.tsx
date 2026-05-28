import { createFileRoute } from "@tanstack/react-router";
import { CategoryPage } from "@/components/sanadak/CategoryPage";
import { ShopsSection } from "@/components/sanadak/CategoriesShowcase";

export const Route = createFileRoute("/shops")({
  head: () => ({ meta: [{ title: "المحلات والأزياء · سندك" }, { name: "description", content: "ملابس وأحذية وإكسسوارات بمقاسات متعددة" }] }),
  component: () => (
    <CategoryPage titleKey="cat_shops" descKey="cat_shops_desc" badge="03">
      {(q) => <ShopsSection query={q} />}
    </CategoryPage>
  ),
});
