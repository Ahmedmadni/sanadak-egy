import { createFileRoute } from "@tanstack/react-router";
import { CategoryPage } from "@/components/sanadak/CategoryPage";
import { MedicalSection } from "@/components/sanadak/CategoriesShowcase";

export const Route = createFileRoute("/medical")({
  head: () => ({ meta: [{ title: "الحجوزات الطبية · سندك" }, { name: "description", content: "احجز طبيبك المناسب — أخصائيين معتمدين في كل التخصصات" }] }),
  component: () => (
    <CategoryPage titleKey="health_title" descKey="health_desc" badge="07">
      {(q) => <MedicalSection query={q} />}
    </CategoryPage>
  ),
});
