import "./globals.css";

export const metadata = {
  title: "Caseware Verity Invoice Rollup",
  description: "Metronome invoice presentation demo for rolling token line items into Verity Usage."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
