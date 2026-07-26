import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ChatWidget from "./components/ChatWidget";
import AmbientBackground from "./components/3d/AmbientBackground";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sahayak — Farmer-to-Consumer Marketplace",
  description: "Sahayak connects farmers directly with consumers. Browse fresh produce listings, place orders, handle emergencies, and get AI-powered assistance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          {/* Persistent 3D ambient background — sits behind all content */}
          <AmbientBackground />
          <Navbar />
          <main className="flex-1 relative" style={{ zIndex: 1 }}>{children}</main>
          <Footer />
          <ChatWidget />
          <Toaster position="bottom-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
