import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tapu Okuyucu - Tapu Kaydı Şerh Analiz Sistemi",
  description: "Tapu kayıtlarındaki haciz şerhlerini otomatik analiz eden masaüstü uygulaması",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
