import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
          <span className="font-semibold tracking-tight">TrankaPortal</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12">{children}</main>
      <footer className="border-t bg-muted/30 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} TrankaPortal · Todos los derechos reservados.
      </footer>
    </div>
  );
}
