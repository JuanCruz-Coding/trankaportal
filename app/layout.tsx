import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { esUY } from "@clerk/localizations";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "TrankaPortal",
  description: "Gestión de Recursos Humanos para PyMEs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // esUY = español rioplatense (Uruguay/Argentina) — la traducción que mejor
    // matchea el tono "vos" que usamos en el resto de la app.
    <ClerkProvider localization={esUY}>
      <html lang="es" className={cn("scroll-smooth scroll-pt-20 font-sans", geist.variable)}>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
