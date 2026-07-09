import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prelegal — Mutual NDA Creator",
  description:
    "Fill in a few details and generate a completed Common Paper Mutual NDA you can download.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-100 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
