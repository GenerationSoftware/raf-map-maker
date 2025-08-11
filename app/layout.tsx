import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Game Map Editor',
  description: 'Tree-based game map editor with monsters and rooms',
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