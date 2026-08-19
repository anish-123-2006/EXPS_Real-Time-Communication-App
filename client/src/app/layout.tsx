import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meshly | Video collaboration",
  description: "Create and join secure Meshly video collaboration rooms.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased dark"
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-50">{children}</body>
    </html>
  );
}
