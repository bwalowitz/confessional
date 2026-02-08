import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Confessional",
  description: "Anonymous, pixelated video confessions."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-booth-900 bg-booth-radial bg-grain">
          {children}
        </div>
      </body>
    </html>
  );
}
