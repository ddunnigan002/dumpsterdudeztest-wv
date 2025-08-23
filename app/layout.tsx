import type React from "react"
import type { Metadata } from "next"
import { Geist } from "next/font/google"
import { Manrope } from "next/font/google"
import { ThemeProvider } from "next-themes"
import { Toaster } from "react-hot-toast"
import "./globals.css"

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
})

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
})

export const metadata: Metadata = {
  title: "Dumpster Dudez Fleet Manager",
  description: "Fleet maintenance and management system for Dumpster Dudez",
  generator: "v0.app",
  applicationName: "Dumpster Dudez Fleet Manager",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Fleet Manager",
  },
  formatDetection: {
    telephone: false,
  },
  themeColor: "#ea580c",
  viewport: {
    width: "device-width",
    initialScale: 1,
    userScalable: false,
  },
  manifest: "/manifest.json",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${geist.variable} ${manrope.variable} antialiased`}>
      <head>
        <link rel="apple-touch-icon" href="/images/dumpster-dudez-logo.svg" />
        <link rel="shortcut icon" href="/images/dumpster-dudez-logo.svg" />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
