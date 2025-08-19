import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Orderbook Depth 3D Visualizer',
  description: 'Real-time cryptocurrency orderbook visualization',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-white" suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  )
}
