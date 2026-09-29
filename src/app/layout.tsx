import type { Metadata } from "next";
import { Geist } from "next/font/google";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Дела в порядке — трекер задач и проектов",
  description:
    "Трекер задач и проектов: дедлайны, статусы, поиск. Данные хранятся в базе и доступны только владельцу аккаунта.",
  applicationName: "Дела в порядке",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
