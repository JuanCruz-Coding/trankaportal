import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y Condiciones · TrankaPortal",
  description:
    "Términos y Condiciones de uso del servicio TrankaPortal — SaaS de gestión de RRHH para PyMEs.",
};

export default function TerminosPage() {
  return (
    <article className="space-y-2">
      <h1 className="text-3xl font-bold tracking-tight">Términos y Condiciones de Uso</h1>
      <p className="text-sm text-muted-foreground">
        Última actualización: <strong>[FECHA_PUBLICACION]</strong>
      </p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
        <Para>
          Estos Términos y Condiciones (en adelante, "Términos") regulan el
          acceso y uso del servicio <strong>TrankaPortal</strong> (en adelante,
          "el Servicio"), provisto por <strong>[TU_RAZON_SOCIAL]</strong>, CUIT{" "}
          <strong>[TU_CUIT]</strong>, con domicilio en <strong>[TU_DIRECCION]</strong>,
          República Argentina.
        </Para>
        <Para>
          Al registrarse y utilizar el Servicio, usted acepta estos Términos en su
          totalidad. Si no está de acuerdo con alguno de los puntos, no utilice el
          Servicio.
        </Para>

        <Section title="1. Descripción del Servicio">
          <Para>
            TrankaPortal es una plataforma SaaS (Software as a Service) de gestión
            de Recursos Humanos diseñada para pequeñas y medianas empresas
            (PyMEs). Las funcionalidades principales incluyen, entre otras:
            gestión de empleados, control de ausencias y vacaciones, registro de
            asistencia, almacenamiento de documentos y portal de autoservicio
            para empleados.
          </Para>
          <Para>
            El Servicio se ofrece bajo distintos planes (Starter, Pro, Business)
            con diferentes niveles de funcionalidad y límites de uso. Los detalles
            de cada plan están disponibles en la página de precios.
          </Para>
        </Section>

        <Section title="2. Cuenta y registro">
          <Para>
            Para usar el Servicio debe crear una cuenta proporcionando información
            veraz, completa y actualizada. Es responsable de mantener la
            confidencialidad de sus credenciales y de toda actividad realizada
            bajo su cuenta.
          </Para>
          <Para>
            Al registrar una organización, usted declara estar autorizado/a para
            representarla. La organización registrada es la "Cuenta cliente" y
            será la titular de los datos cargados en la plataforma.
          </Para>
        </Section>

        <Section title="3. Planes y pagos">
          <Para>
            Los planes pagos se cobran de forma mensual. Los precios y
            características de cada plan se publican en la página de precios y
            pueden modificarse con aviso previo de 15 días al email registrado.
          </Para>
          <Para>
            Los pagos no son reembolsables salvo en los casos previstos por la
            legislación vigente. El plan Starter es gratuito y puede tener
            limitaciones de funcionalidad o cantidad de empleados.
          </Para>
        </Section>

        <Section title="4. Uso aceptable">
          <Para>Usted se compromete a:</Para>
          <ul className="ml-6 list-disc space-y-1.5">
            <li>Usar el Servicio únicamente para fines lícitos y conforme a la legislación argentina vigente.</li>
            <li>No intentar acceder a cuentas, datos u organizaciones de terceros.</li>
            <li>No subir contenido ilegal, ofensivo, o que infrinja derechos de terceros.</li>
            <li>No realizar ingeniería inversa, descompilar, ni intentar comprometer la seguridad del Servicio.</li>
            <li>No usar el Servicio para enviar spam, malware o cualquier comunicación no solicitada.</li>
          </ul>
          <Para>
            El incumplimiento de estas reglas puede resultar en la suspensión o
            terminación inmediata del Servicio sin reembolso.
          </Para>
        </Section>

        <Section title="5. Propiedad intelectual">
          <Para>
            El software, marca, diseño y contenido del Servicio son propiedad de{" "}
            <strong>[TU_RAZON_SOCIAL]</strong>. Los datos cargados por usted
            (información de empleados, documentos, registros, etc.) son de su
            propiedad — TrankaPortal actúa exclusivamente como custodio y
            procesador de dichos datos para proveerle el Servicio.
          </Para>
        </Section>

        <Section title="6. Datos personales">
          <Para>
            El tratamiento de los datos personales se rige por nuestra{" "}
            <a href="/legal/privacidad" className="text-primary hover:underline">
              Política de Privacidad
            </a>
            , que forma parte integral de estos Términos. Cumplimos con la Ley
            25.326 de Protección de los Datos Personales y demás normativa
            aplicable de la República Argentina.
          </Para>
        </Section>

        <Section title="7. Disponibilidad y soporte">
          <Para>
            Hacemos esfuerzos razonables para mantener el Servicio disponible
            24/7, pero no garantizamos disponibilidad ininterrumpida. Podemos
            realizar mantenimientos programados con aviso previo cuando sea
            posible.
          </Para>
          <Para>
            No nos responsabilizamos por interrupciones causadas por terceros
            (proveedores de infraestructura, conectividad de internet, eventos de
            fuerza mayor, etc.).
          </Para>
        </Section>

        <Section title="8. Cancelación y terminación">
          <Para>
            Usted puede cancelar su cuenta en cualquier momento desde la sección
            de Configuración o contactándonos por email. Tras la cancelación, sus
            datos serán retenidos por <strong>30 días</strong> para permitirle
            exportarlos, y luego serán eliminados permanentemente, salvo aquellos
            que debamos conservar por obligación legal.
          </Para>
          <Para>
            Podemos suspender o terminar su cuenta si incurre en violaciones
            graves a estos Términos, con o sin aviso previo según la naturaleza
            de la falta.
          </Para>
        </Section>

        <Section title="9. Limitación de responsabilidad">
          <Para>
            El Servicio se ofrece "tal cual" y "según disponibilidad". En la
            máxima medida permitida por la ley, TrankaPortal no se responsabiliza
            por daños indirectos, lucro cesante, pérdida de datos o cualquier
            daño consecuencial derivado del uso o imposibilidad de uso del
            Servicio.
          </Para>
          <Para>
            Nuestra responsabilidad total no excederá el monto efectivamente
            pagado por usted en los últimos 12 meses.
          </Para>
        </Section>

        <Section title="10. Modificaciones a los Términos">
          <Para>
            Podemos modificar estos Términos. Los cambios materiales serán
            notificados con al menos 15 días de anticipación al email registrado.
            El uso continuado del Servicio después de la entrada en vigencia de
            los cambios implica aceptación de los nuevos Términos.
          </Para>
        </Section>

        <Section title="11. Ley aplicable y jurisdicción">
          <Para>
            Estos Términos se rigen por las leyes de la República Argentina.
            Cualquier disputa que surja en relación con estos Términos o con el
            Servicio será resuelta en los Tribunales Ordinarios de{" "}
            <strong>[JURISDICCION]</strong>, con renuncia expresa a cualquier
            otra jurisdicción que pudiera corresponder.
          </Para>
        </Section>

        <Section title="12. Contacto">
          <Para>Para consultas, reclamos o notificaciones relacionadas con estos Términos:</Para>
          <ul className="ml-6 list-disc space-y-1.5">
            <li>
              <strong>Email</strong>: [TU_EMAIL_CONTACTO]
            </li>
            <li>
              <strong>Domicilio</strong>: [TU_DIRECCION]
            </li>
            <li>
              <strong>CUIT</strong>: [TU_CUIT]
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

function Para({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>;
}
