/**
 * EmailProvider abstract. Dos implementaciones:
 *  - ConsoleEmailProvider: loggea a stdout. Uso en dev/demo sin dominio.
 *  - ResendEmailProvider: manda de verdad con Resend. Activar cuando
 *    tengas dominio verificado y RESEND_API_KEY cargada.
 *
 * La selección es por env var EMAIL_PROVIDER (default: "console").
 */

export type EmailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

export interface EmailProvider {
  send(payload: EmailPayload): Promise<void>;
}

class ConsoleEmailProvider implements EmailProvider {
  async send(payload: EmailPayload): Promise<void> {
    const to = Array.isArray(payload.to) ? payload.to.join(", ") : payload.to;
    // Formato fácil de spotear en Vercel logs.
    console.log("📧 [EMAIL-CONSOLE]", {
      to,
      subject: payload.subject,
      preview: payload.html.slice(0, 200),
    });
  }
}

class ResendEmailProvider implements EmailProvider {
  async send(payload: EmailPayload): Promise<void> {
    const { Resend } = await import("resend");
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    if (!apiKey) throw new Error("RESEND_API_KEY no definida.");
    if (!from) throw new Error("RESEND_FROM_EMAIL no definida.");

    const client = new Resend(apiKey);
    const { error } = await client.emails.send({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
    if (error) throw new Error(`Resend error: ${error.message ?? "desconocido"}`);
  }
}

let _provider: EmailProvider | null = null;

export function emailProvider(): EmailProvider {
  if (_provider) return _provider;
  const kind = process.env.EMAIL_PROVIDER ?? "console";
  _provider = kind === "resend" ? new ResendEmailProvider() : new ConsoleEmailProvider();
  return _provider;
}

/**
 * Fire-and-forget: log error pero no bloquea la transacción principal.
 * Usarlo en server actions donde el email es "nice to have" pero no critical.
 */
export async function sendEmailSafe(payload: EmailPayload): Promise<void> {
  try {
    await emailProvider().send(payload);
  } catch (err) {
    console.error("[email] Error al enviar:", err);
  }
}
