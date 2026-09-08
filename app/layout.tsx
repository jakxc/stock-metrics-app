import type { Metadata } from "next";
import { Ubuntu_Mono } from 'next/font/google';
import "./globals.css";
import Navigation from "./components/Navigation";
import { AuthProvider } from "@/contexts/AuthContext";

const ubuntuMono = Ubuntu_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-ubuntu-mono', // Defines the CSS variable
});

export const metadata: Metadata = {
  title: "Stock Tracker",
  description: "Track stock financial metrics including EPS, dividends, P/E ratio, and growth",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${ubuntuMono.variable} font-mono antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <Navigation />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
