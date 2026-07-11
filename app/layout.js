import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Trackly - Price Tracker",
  description: "Price tracker and alert system for e-commerce products",
  icons: {
    icon: '/android-chrome-192x192.png',
    shortcut: '/android-chrome-512x512.jpg',
    apple: '/apple-touch-icon.jpg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="icon" href="/lo.jpg" />
      </head>
      <body className="min-h-full flex flex-col">{children}
        <Toaster richColors />
      </body>
    </html>
  );
}
