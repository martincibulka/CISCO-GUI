import "./globals.css";

export const metadata = {
  title: "Cisco Switch GUI",
  description: "Total Commander style dual-pane Cisco switch manager",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
