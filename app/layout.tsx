import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "DOMYX AI — Your intelligence, amplified", description: "A calmer, smarter workspace for your AI agents." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
