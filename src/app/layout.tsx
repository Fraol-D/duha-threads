import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { CartProvider } from "@/components/CartProvider";
import { WishlistProvider } from "@/components/WishlistProvider";
import { Footer } from "@/components/Footer";
import { Container } from "@/components/Container";
import { Analytics } from "@vercel/analytics/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Duha Threads",
    template: "%s | Duha Threads",
  },
  description: "Custom apparel storefront and builder created by Duha Threads.",
  icons: {
    icon: [
      { url: "/favicons/favicon.ico" },
      { url: "/favicons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: { url: "/favicons/apple-touch-icon.png", sizes: "180x180" },
    shortcut: ["/favicons/favicon.ico"],
    other: [
      { rel: "android-chrome", url: "/favicons/android-chrome-192x192.png" },
      { rel: "android-chrome", url: "/favicons/android-chrome-512x512.png" },
    ],
  },
  manifest: "/favicons/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col bg-[--bg] text-[--fg]`}>
        <CartProvider>
          <WishlistProvider>
            <Header />
            <main className="flex-1 pt-20">
              <Container>{children}</Container>
            </main>
            <Footer />
            <Analytics />
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}
