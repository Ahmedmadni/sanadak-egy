import { createFileRoute } from "@tanstack/react-router";
import { CategoryPage } from "@/components/sanadak/CategoryPage";
import { RestaurantsSection } from "@/components/sanadak/CategoriesShowcase";

export const Route = createFileRoute("/restaurants")({
  head: () => ({ meta: [{ title: "المطاعم · سندك" }, { name: "description", content: "أشهى المطاعم في مصر مع توصيل وطلب فوري" }] }),
  component: () => (
    <CategoryPage titleKey="cat_restaurants" descKey="cat_restaurants_desc" badge="01">
      {(q) => <RestaurantsSection query={q} />}
    </CategoryPage>
  ),
});
