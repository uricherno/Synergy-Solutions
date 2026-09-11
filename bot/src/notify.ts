import { execTool } from './composioClient.js';
import { config } from './config.js';
import type { IgMessage } from './instagram.js';

export async function notifyNewMessage(message: IgMessage): Promise<void> {
  const from = message.fromUsername ? `@${message.fromUsername}` : message.fromId;
  try {
    await execTool('GMAIL_SEND_EMAIL', {
      recipient_email: config.alertEmail,
      subject: `Nuevo mensaje de Instagram: ${from}`,
      body: `Te escribió ${from} por Instagram:\n\n"${message.text}"\n\nEl asistente ya le está respondiendo. Podés seguir la conversación completa desde Instagram.`,
    });
  } catch (err) {
    // Un fallo del aviso no debe frenar la respuesta automática al cliente.
    console.warn('No se pudo enviar el aviso por mail:', (err as Error).message);
  }
}
