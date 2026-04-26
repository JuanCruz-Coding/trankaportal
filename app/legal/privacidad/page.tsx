import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidad · TrankaPortal",
  description:
    "Política de Privacidad de TrankaPortal — qué datos recolectamos, cómo los usamos y tus derechos según la Ley 25.326.",
};

export default function PrivacidadPage() {
  return (
    <article className="space-y-2">
      <h1 className="text-3xl font-bold tracking-tight">Política de Privacidad</h1>
      <p className="text-sm text-muted-foreground">
        Última actualización: <strong>[FECHA_PUBLICACION]</strong>
      </p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
        <Para>
          En TrankaPortal nos tomamos la privacidad en serio. Esta política
          explica qué datos personales recolectamos, cómo los usamos, con quién
          los compartimos, y qué derechos tenés sobre ellos.
        </Para>
        <Para>
          Cumplimos con la <strong>Ley 25.326 de Protección de los Datos Personales</strong>{" "}
          de la República Argentina y con las demás normativas aplicables.
        </Para>

        <Section title="1. Quiénes somos">
          <Para>
            <strong>[TU_RAZON_SOCIAL]</strong>, CUIT <strong>[TU_CUIT]</strong>, con
            domicilio en <strong>[TU_DIRECCION]</strong> (en adelante,
            "TrankaPortal" o "nosotros").
          </Para>
        </Section>

        <Section title="2. Qué datos recolectamos">
          <Sub title="2.1 Datos de la cuenta titular (administrador)" />
          <Para>Cuando te registrás como administrador de una organización, recolectamos:</Para>
          <ul className="ml-6 list-disc space-y-1.5">
            <li>Nombre y apellido</li>
            <li>Dirección de email</li>
            <li>Información de la organización (nombre, plan elegido)</li>
            <li>Logs de acceso (IP, fecha/hora, navegador) por motivos de seguridad</li>
          </ul>

          <Sub title="2.2 Datos de empleados" />
          <Para>
            Si cargás información de empleados en TrankaPortal, esos datos pueden incluir:
          </Para>
          <ul className="ml-6 list-disc space-y-1.5">
            <li>Datos personales: nombre, DNI, fecha de nacimiento, dirección, teléfono</li>
            <li>Datos laborales: puesto, departamento, fecha de ingreso, tipo de contrato, salario</li>
            <li>Documentos adjuntos (contratos, recibos, etc.)</li>
            <li>Registros de ausencias y asistencia</li>
          </ul>
          <Para>
            <strong>Importante:</strong> estos datos los carga el cliente (la
            organización). Nosotros actuamos como <strong>encargados de tratamiento</strong>{" "}
            según la Ley 25.326 — la responsabilidad sobre el consentimiento de
            los empleados y la legalidad de la carga recae en la organización
            cliente.
          </Para>

          <Sub title="2.3 Datos técnicos" />
          <Para>
            Recolectamos automáticamente datos técnicos como dirección IP, tipo
            de dispositivo, navegador y patrones de uso del Servicio. Esto se usa
            para diagnóstico, seguridad y mejora del producto.
          </Para>
        </Section>

        <Section title="3. Cómo usamos los datos">
          <Para>Los datos se usan exclusivamente para:</Para>
          <ul className="ml-6 list-disc space-y-1.5">
            <li>Proveer el Servicio (autenticación, almacenamiento, funcionalidades).</li>
            <li>Comunicarnos con vos sobre el Servicio (notificaciones, cambios, soporte).</li>
            <li>Cumplir con obligaciones legales (facturación, AFIP, ante requerimientos judiciales).</li>
            <li>Mejorar el Servicio mediante análisis agregado y anonimizado.</li>
          </ul>
          <Para>
            <strong>No vendemos datos personales a terceros.</strong> No usamos los datos
            de tus empleados para ningún fin distinto de proveerte el Servicio.
          </Para>
        </Section>

        <Section title="4. Con quién los compartimos">
          <Para>
            Compartimos datos exclusivamente con los siguientes proveedores de
            infraestructura, todos con compromisos contractuales de
            confidencialidad y seguridad:
          </Para>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2 text-left font-medium text-foreground">Proveedor</th>
                  <th className="p-2 text-left font-medium text-foreground">Finalidad</th>
                  <th className="p-2 text-left font-medium text-foreground">Ubicación</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Clerk Inc.", "Autenticación y gestión de usuarios", "Estados Unidos"],
                  ["Supabase Inc.", "Base de datos y storage de archivos", "Estados Unidos / São Paulo"],
                  ["Vercel Inc.", "Hosting de la aplicación", "Estados Unidos"],
                  ["Resend Inc.", "Envío de emails transaccionales", "Estados Unidos"],
                ].map(([prov, fin, loc]) => (
                  <tr key={prov} className="border-t">
                    <td className="p-2 font-medium text-foreground">{prov}</td>
                    <td className="p-2">{fin}</td>
                    <td className="p-2">{loc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Para>
            Estas transferencias internacionales se realizan en cumplimiento de la
            Ley 25.326 y las disposiciones de la AAIP (Agencia de Acceso a la
            Información Pública).
          </Para>
        </Section>

        <Section title="5. Cookies y tecnologías similares">
          <Para>
            Usamos cookies estrictamente necesarias para el funcionamiento del
            Servicio (mantener sesión, preferencias). No usamos cookies de
            tracking publicitario ni perfiles de comportamiento.
          </Para>
        </Section>

        <Section title="6. Tus derechos">
          <Para>
            Como titular de tus datos personales, tenés los siguientes derechos
            según la Ley 25.326:
          </Para>
          <ul className="ml-6 list-disc space-y-1.5">
            <li><strong>Acceso</strong>: pedir información sobre qué datos tuyos tenemos.</li>
            <li><strong>Rectificación</strong>: corregir datos inexactos.</li>
            <li><strong>Actualización</strong>: actualizar datos desactualizados.</li>
            <li>
              <strong>Supresión</strong>: pedir que borremos tus datos (sujeto a
              obligaciones legales que puedan requerir conservarlos).
            </li>
            <li><strong>Oposición</strong>: oponerte al tratamiento de tus datos.</li>
          </ul>
          <Para>
            Para ejercer cualquiera de estos derechos, escribinos a{" "}
            <strong>[TU_EMAIL_CONTACTO]</strong>. Respondemos dentro de los 10
            días corridos.
          </Para>
          <Para>
            Tenés también el derecho a presentar un reclamo ante la{" "}
            <strong>Agencia de Acceso a la Información Pública (AAIP)</strong>,
            autoridad de aplicación de la ley.
          </Para>
        </Section>

        <Section title="7. Seguridad de los datos">
          <Para>
            Implementamos medidas técnicas y organizativas para proteger los
            datos:
          </Para>
          <ul className="ml-6 list-disc space-y-1.5">
            <li>Cifrado en tránsito (HTTPS/TLS).</li>
            <li>Cifrado en reposo (Supabase + Vercel).</li>
            <li>Control de acceso basado en roles (RBAC).</li>
            <li>Aislamiento por tenant (cada organización ve solo sus datos).</li>
            <li>Auditoría de accesos a través de logs.</li>
          </ul>
          <Para>
            Pese a estas medidas, ninguna plataforma es 100% inmune a incidentes.
            En caso de un incidente de seguridad que afecte tus datos, te
            notificaremos dentro de los plazos previstos por la ley.
          </Para>
        </Section>

        <Section title="8. Retención de datos">
          <Para>
            Conservamos tus datos mientras tu cuenta esté activa. Tras la
            cancelación, los datos quedan disponibles durante <strong>30 días</strong> para
            que puedas exportarlos (vía soporte) y luego se eliminan
            permanentemente, salvo aquellos que debamos conservar por obligación
            legal (registros fiscales, etc.).
          </Para>
        </Section>

        <Section title="9. Datos de menores">
          <Para>
            TrankaPortal está dirigido a empresas y mayores de 18 años. No
            recolectamos conscientemente datos de menores. Si detectás que se
            cargaron datos de un menor en la plataforma, contactanos y los
            eliminaremos.
          </Para>
        </Section>

        <Section title="10. Cambios a esta política">
          <Para>
            Si modificamos esta política, te notificaremos al email registrado al
            menos 15 días antes de la entrada en vigencia. La fecha de "Última
            actualización" arriba refleja siempre la versión vigente.
          </Para>
        </Section>

        <Section title="11. Contacto">
          <Para>
            Para consultas sobre privacidad, ejercicio de derechos, o reclamos:
          </Para>
          <ul className="ml-6 list-disc space-y-1.5">
            <li>
              <strong>Email</strong>: [TU_EMAIL_CONTACTO]
            </li>
            <li>
              <strong>Domicilio</strong>: [TU_DIRECCION]
            </li>
          </ul>
          <Para>Autoridad de control:</Para>
          <ul className="ml-6 list-disc space-y-1.5">
            <li>
              <strong>AAIP</strong>:{" "}
              <a
                href="https://www.argentina.gob.ar/aaip"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                www.argentina.gob.ar/aaip
              </a>
            </li>
          </ul>
        </Section>
      </div>
    </article>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Sub({ title }: { title: string }) {
  return <h3 className="mt-4 text-base font-medium text-foreground">{title}</h3>;
}

function Para({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>;
}
