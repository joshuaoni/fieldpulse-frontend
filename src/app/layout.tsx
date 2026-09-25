import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";
import { QueryProvider } from "@/lib/query-client";
import { SessionProvider } from "@/lib/session";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FieldPulse",
  description: "Field sales visit verification, planning, and reporting.",
  applicationName: "FieldPulse",
  appleWebApp: {
    capable: true,
    title: "FieldPulse",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#10543e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${dmSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <QueryProvider>
          <SessionProvider>{children}</SessionProvider>
        </QueryProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
