import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { PwaProvider } from "@/components/providers/pwa-provider";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
  "https://omnifaind.com";
const metadataBase = new URL(siteUrl);

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase,
  title: {
    default:
      "OmniFAIND | AI sourcing & screening for professional networks",
    template: "%s | OmniFAIND",
  },
  description:
    "OmniFAIND is the AI sourcing and screening workspace for professional networks, talent hubs, and freelance marketplaces. Generate lead lists, qualify candidates, and run outreach faster.",
  keywords: [
    "AI sourcing",
    "professional network sourcing",
    "talent sourcing",
    "candidate screening",
    "lead generation",
    "sales prospecting",
    "developer talent",
    "candidate screening",
    "B2B leads",
    "tech recruiting",
    "outreach automation",
  ],
  applicationName: "OmniFAIND",
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "OmniFAIND | AI sourcing & screening for professional networks",
    description:
      "Generate leads from professional networks and talent hubs, then screen and rank candidates with AI.",
    siteName: "OmniFAIND",
    images: [{ url: "/omnifaind-logo-circle.png", width: 500, height: 500 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OmniFAIND | AI sourcing & screening for professional networks",
    description:
      "AI searches professional networks and talent hubs for leads, then screens them for fit.",
    images: ["/omnifaind-logo-circle.png"],
  },
  icons: {
    icon: [
      { url: "/omnifaind-logo-circle.png", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/omnifaind-logo-circle.png",
    apple: "/omnifaind-logo-circle.png",
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f172a" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PwaProvider />
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
