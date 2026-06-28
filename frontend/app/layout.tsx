import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "IITD IAM",
  description: "Central identity and access management console"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

