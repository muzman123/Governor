import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Governor — AI cost receipts",
  description: "Transparent estimated Codex cost receipts for commits and pull requests."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
