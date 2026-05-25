import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/sanadak/Nav";
import { Hero } from "@/components/sanadak/Hero";
import { CategoriesShowcase } from "@/components/sanadak/CategoriesShowcase";
import { MerchantSection } from "@/components/sanadak/MerchantSection";
import { CTA } from "@/components/sanadak/CTA";
import { CartSheet } from "@/components/sanadak/CartSheet";
import { MerchantDialog } from "@/components/sanadak/MerchantDialog";
import { SanadakProvider } from "@/lib/sanadak-context";
import { Toaster } from "@/components/ui/sonner";

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
    <SanadakProvider>
      <main className="relative">
        <Nav />
        <Hero />
        <CategoriesShowcase />
        <MerchantSection />
        <CTA />
        <CartSheet />
        <MerchantDialog />
        <Toaster richColors position="top-center" />
      </main>
    </SanadakProvider>
  );
}
