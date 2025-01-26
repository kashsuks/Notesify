'use client';

import localFont from "next/font/local";
import "./globals.css";
import { SidebarTrigger, SidebarProvider } from "@/components/ui/sidebar";
import { UserProvider } from '@auth0/nextjs-auth0/client';
import NavBar from '../components/NavBar';
import './globals.css';
import { Container } from 'reactstrap';
import React from 'react';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html>
      <body>
        <UserProvider>
          <main className="w-full">
            <NavBar />
            {children}
          </main>
        </UserProvider>
      </body>
    </html>
  );
}
