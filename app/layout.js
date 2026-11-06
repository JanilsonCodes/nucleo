import "./globals.css";
import ThemeProvider from "./theme-provider";
import PWAInstall from "@/components/PWAInstall";

export const metadata = {
  title: "NUCLEO — Gestão de Equipas",
  description: "Organiza, coordena e acompanha o trabalho da tua equipa.",
  manifest: "/manifest.json",
  applicationName: "Núcleo",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Núcleo" },
  icons: { icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }, { url: "/icon-512.png", sizes: "512x512", type: "image/png" }], apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }] },
  themeColor: "#111111",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}<PWAInstall /></ThemeProvider>
      </body>
    </html>
  );
}
