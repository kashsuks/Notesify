import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SidebarTrigger, SidebarProvider } from "@/components/ui/sidebar";

export const metadata: Metadata = {
  title: "Notesify",
  description: "AI based notes app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html>
      <body>
          <main className="w-full">
            {children}
          </main>
      </body>
    </html>
  );
}
