import type React from "react"
import "./globals.css"

export const metadata = {
  title: 'AI AR Tools',
  description: 'Transform your images with the power of AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
