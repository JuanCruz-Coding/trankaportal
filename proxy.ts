import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Matcher de rutas públicas. Todo lo que NO matchee acá requiere sesión.
// Los webhooks SIEMPRE deben ser públicos — Clerk (u otros) no mandan sesión,
// y la autenticación se hace verificando la firma del webhook dentro del handler.
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks/(.*)",
  "/legal/(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next internals y archivos estáticos
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Siempre correr para las rutas de API
    "/(api|trpc)(.*)",
  ],
};
