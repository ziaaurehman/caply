import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import AuthProvider from "@/components/layout/AuthProvider"
import { ToastProvider } from "@/components/providers/ToastProvider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Caply - Resource & Capacity Planning",
  description: "Your complete resource and capacity planning solution",
    generator: 'v0.0.1'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
        <ToastProvider />
      </body>
    </html>
  )
}
