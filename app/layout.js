import "./globals.css";
import ThemeProvider from "./theme-provider";

export const metadata = {
  title: "NUCLEO — Gestão de Equipas",
  description: "Organiza, coordena e acompanha o trabalho da tua equipa.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
