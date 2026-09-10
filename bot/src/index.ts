import { config } from './config.js';
import {
  getMyAccountId,
  listConversations,
  listMessages,
  sendTextMessage,
  markSeen,
  type IgMessage,
} from './instagram.js';
import { generateReply } from './ai.js';
import { getLastMessageId, setLastMessageId } from './state.js';

function sortByDate(messages: IgMessage[]): IgMessage[] {
  return [...messages].sort(
    (a, b) => new Date(a.createdTime).getTime() - new Date(b.createdTime).getTime()
  );
}

async function processConversation(conversationId: string, myAccountId: string): Promise<void> {
  const messages = await listMessages(conversationId, 15);
  if (messages.length === 0) return;

  const sorted = sortByDate(messages);
  const lastInbound = [...sorted].reverse().find((m) => m.fromId !== myAccountId);
  if (!lastInbound) return; // todavía no escribió el cliente

  const alreadyHandled = await getLastMessageId(conversationId);
  if (alreadyHandled === lastInbound.id) return; // ya respondimos este mensaje

  console.log(
    `[${conversationId}] mensaje nuevo de ${lastInbound.fromUsername ?? lastInbound.fromId}: "${lastInbound.text}"`
  );

  const reply = await generateReply(sorted, myAccountId);
  if (!reply) {
    console.warn(`[${conversationId}] la IA no generó respuesta, se omite este turno.`);
    return;
  }

  try {
    await sendTextMessage(lastInbound.fromId, reply);
    console.log(`[${conversationId}] respondido: "${reply}"`);
    await markSeen(lastInbound.fromId);
  } catch (err) {
    console.error(`[${conversationId}] no se pudo enviar la respuesta:`, (err as Error).message);
  } finally {
    // Igual marcamos como manejado para no reintentar en loop si el error es
    // permanente (ej: la ventana de 24hs de mensajería ya cerró).
    await setLastMessageId(conversationId, lastInbound.id);
  }
}

async function tick(myAccountId: string): Promise<void> {
  try {
    const conversations = await listConversations(25);
    for (const conversation of conversations) {
      await processConversation(conversation.id, myAccountId);
    }
  } catch (err) {
    console.error('Error revisando conversaciones:', (err as Error).message);
  }
}

async function main(): Promise<void> {
  console.log('Asistente de Instagram de Synergy Solutions iniciando...');

  const myAccountId = await getMyAccountId();
  if (!myAccountId) {
    console.error(
      'No se pudo confirmar la cuenta de Instagram conectada. Revisá que la conexión esté Activa en Composio (dashboard.composio.dev) antes de reintentar.'
    );
    process.exit(1);
  }

  console.log(`Cuenta de Instagram conectada: ${myAccountId}`);
  console.log(`Revisando mensajes nuevos cada ${config.pollIntervalMs / 1000}s. Ctrl+C para detener.`);

  await tick(myAccountId);
  setInterval(() => tick(myAccountId), config.pollIntervalMs);
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
