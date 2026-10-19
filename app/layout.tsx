import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "সময়ের পথে | বাংলা সংবাদ",
  description: "সময়ের সঙ্গে, সত্যের পথে — সময়ের পথে বাংলা সংবাদপত্র।",
  metadataBase: new URL("https://somoyerpotha.com"),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="bn"><head><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/><link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Bengali:wght@400;500;600;700;800&family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap" rel="stylesheet"/></head><body>{children}</body></html>;
}
