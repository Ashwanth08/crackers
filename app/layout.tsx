import type { Metadata, Viewport } from "next";
import "../styles/globals.css";

import BottomNav from "../components/BottomNav";
import Header from "../components/Header";
import { CartProvider } from "../lib/cart/CartContext";

/**
 * Descriptive, SEO-friendly document metadata (Req 19.4).
 *
 * Beyond the basic title/description we add Open Graph tags so links shared on
 * social/chat apps render a rich preview, and keywords describing the business.
 */
export const metadata: Metadata = {
  title: {
    default: "Sri Crackers — Quality Crackers at Sivakasi Wholesale Rate",
    template: "%s · Sri Crackers",
  },
  description:
    "Order crackers online from Sri Crackers. Browse the catalogue, build your cart, and submit your order at Sivakasi wholesale rates.",
  keywords: [
    "Sri Crackers",
    "crackers",
    "Sivakasi crackers",
    "fireworks",
    "Diwali crackers",
    "online crackers order",
  ],
  openGraph: {
    title: "Sri Crackers — Quality Crackers at Sivakasi Wholesale Rate",
    description:
      "Browse the Sri Crackers catalogue, build your cart, and submit your order at Sivakasi wholesale rates.",
    siteName: "Sri Crackers",
    type: "website",
    locale: "en_IN",
  },
};

/**
 * Viewport + theme configuration (Next 14 split export). The theme colour
 * matches the festive navy brand surface used by the sticky Header.
 */
export const viewport: Viewport = {
  themeColor: "#0E1333",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/*
          CartProvider owns the live cart for the whole app. The sticky Header
          and mobile BottomNav are client components that call useCart(), so
          they must live inside the provider — rendering them here makes them
          appear on every page. layout.tsx itself stays a server component.
        */}
        <CartProvider>
          <Header />
          {/*
            Bottom padding (pb-24) keeps page content clear of the fixed
            BottomNav / page-level CartBar on mobile so nothing is obscured.
          */}
          <div className="pb-24">{children}</div>
          <BottomNav />
        </CartProvider>
      </body>
    </html>
  );
}
