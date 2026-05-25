import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/sanadak/Nav";
import { Hero } from "@/components/sanadak/Hero";
import { ServiceShowcase } from "@/components/sanadak/ServiceShowcase";
import { CTA } from "@/components/sanadak/CTA";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sanadak سندك — Your smart gateway to every service" },
      { name: "description", content: "Sanadak is Saudi Arabia's premium super-app: food delivery, medical bookings, marketplace, live tracking, and a unified services hub." },
      { property: "og:title", content: "Sanadak سندك — Smart super-app for KSA" },
      { property: "og:description", content: "Food, health, shopping, and delivery — beautifully unified." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="relative">
      <Nav />
      <Hero />
      <ServiceShowcase />
      <CTA />
    </main>
  );
}
