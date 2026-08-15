import nodemailer, { Transporter } from "nodemailer";

export interface AlertaEnlaceCaido {
  municipioId: string;
  enlaceId: string;
  url: string;
  seccionNombre: string;
}

/**
 * En local (sin SMTP_HOST configurado) solo loggea — así el worker corre
 * sin depender de un proveedor de correo real para desarrollo. En
 * producción, SMTP_HOST/SMTP_USER/SMTP_PASSWORD apuntan al proveedor
 * transaccional real (ver .env.example).
 */
export class NotificacionService {
  private transporter: Transporter | null;

  constructor() {
    this.transporter = process.env.SMTP_HOST
      ? nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT ?? 587),
          auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
        })
      : null;
  }

  async alertarEnlaceCaido(alerta: AlertaEnlaceCaido, destinatarios: string[]): Promise<void> {
    const asunto = `[Centinela TA] Enlace caído: ${alerta.seccionNombre}`;
    const cuerpo = `El enlace de la sección "${alerta.seccionNombre}" no responde:\n${alerta.url}\n\nRevísalo en el panel de Centinela TA.`;

    if (!this.transporter) {
      console.log(`[notificacion:stub] ${asunto} -> ${destinatarios.join(", ") || "(sin destinatarios)"}`);
      console.log(`  ${cuerpo.replace(/\n/g, " ")}`);
      return;
    }

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM ?? "Centinela TA <alertas@centinela-ta.cl>",
      to: destinatarios,
      subject: asunto,
      text: cuerpo,
    });
  }
}
