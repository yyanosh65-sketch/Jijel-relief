import AppShell from "@/components/AppShell";
import { AppFooter } from "@/components/layout/AppFooter";
import type { Metadata } from "next";
import { Cairo, Readex_Pro } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  display: "swap",
});

const readexPro = Readex_Pro({
  variable: "--font-readex",
  subsets: ["arabic", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "جيجل للتعافي",
  description:
    "منصة مجتمعية لتسجيل احتياجات إعادة الإعمار في ولاية جيجل — عاون وين تقدر.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${readexPro.variable} h-full antialiased`}
    >
      <body dir="rtl" className="dashboard-canvas flex min-h-full flex-col font-sans leading-relaxed tracking-wide antialiased">
        <AppShell>{children}</AppShell>
        <AppFooter />
      </body>
    </html>
  );
}
