import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VNR VJIET • Centralized Campus Governance & Service Portal",
  description: "Official Campus Governance Lifecycle & Service Portal for VNR Vignana Jyothi Institute of Engineering and Technology (Autonomous)",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/favicon.ico" }
    ],
    shortcut: "/icon.png",
    apple: "/icon.png"
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/icon.png" />
        <link rel="shortcut icon" href="/icon.png" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap"
        />
      </head>
      <body className="min-h-screen beige-mesh-bg font-sans antialiased text-[#28221a]">
        {children}
      </body>
    </html>
  );
}
