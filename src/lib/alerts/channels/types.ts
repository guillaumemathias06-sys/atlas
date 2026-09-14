// Abstraction canal de notification — IN_APP est actif nativement (stocké en DB).
// EMAIL / PUSH / TELEGRAM / SMS sont préparés mais non connectés en V1 (section 12) :
// pas de clé API/service configuré = pas de blocage, on reste sur IN_APP.
export interface NotificationChannel {
  readonly name: string;
  readonly configured: boolean;
  send(message: string): Promise<void>;
}

export class InAppChannel implements NotificationChannel {
  readonly name = "IN_APP";
  readonly configured = true;
  async send(_message: string): Promise<void> {
    // No-op : l'alerte est déjà persistée en DB par alerts/engine.ts et lue par l'UI.
  }
}

export class TelegramChannel implements NotificationChannel {
  readonly name = "TELEGRAM";
  readonly configured = Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
  async send(message: string): Promise<void> {
    if (!this.configured) return;
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message }),
    });
  }
}

export class EmailChannel implements NotificationChannel {
  readonly name = "EMAIL";
  readonly configured = Boolean(process.env.RESEND_API_KEY && process.env.ATLAS_ALERT_EMAIL_TO);
  async send(_message: string): Promise<void> {
    if (!this.configured) return;
    // Phase 4+: intégrer Resend/SMTP ici.
  }
}

export const channels: NotificationChannel[] = [new InAppChannel(), new TelegramChannel(), new EmailChannel()];
