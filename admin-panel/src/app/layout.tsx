import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FiveM Apex Core - Database Admin Portal",
  description: "Next-gen administrative database manager with full RBAC & Audit Trails",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (window.matchMedia('(prefers-color-scheme: light)').matches) {
                  document.documentElement.classList.remove('dark');
                } else {
                  document.documentElement.classList.add('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="antialiased selection:bg-primary/20">{children}</body>
    </html>
  );
}
