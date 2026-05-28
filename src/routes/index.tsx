import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "@/components/sanadak/Hero";
import { HomeCategories } from "@/components/sanadak/HomeCategories";
import { MerchantSection } from "@/components/sanadak/MerchantSection";
import { CTA } from "@/components/sanadak/CTA";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "سندك Sanadak — كل خدماتك في مكان واحد" },
      { name: "description", content: "سندك هو السوبر-آب المصري الفاخر: توصيل طعام، حجوزات طبية، تسوق، تتبع مباشر، ومركز خدمات موحد." },
      { property: "og:title", content: "سندك Sanadak — السوبر-آب المصري" },
      { property: "og:description", content: "طعام، صحة، تسوق، وتوصيل — في تطبيق واحد أنيق." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <Hero />
      <HomeCategories />
      <MerchantSection />
      <CTA />
    </>
  );
}
