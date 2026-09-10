import { composio } from './composioClient.js';
import { config } from './config.js';

export type IgMessage = {
  id: string;
  text: string;
  createdTime: string;
  fromId: string;
  fromUsername?: string;
};

export type IgConversation = {
  id: string;
};

/**
 * Composio a veces devuelve el payload de Graph API "doble envuelto"
 * (ej: { data: { data: [...] } }). Esta función busca el array real
 * en las formas más comunes en las que puede venir.
 */
function unwrapList(raw: unknown): any[] {
  const data = (raw as any)?.data ?? raw;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

async function exec<T = unknown>(slug: string, args: Record<string, unknown>): Promise<T> {
  const result = await composio.tools.execute(slug, {
    userId: config.composioUserId,
    arguments: args,
  });
  if (!result.successful) {
    throw new Error(`${slug} falló: ${JSON.stringify(result.error)}`);
  }
  return result.data as T;
}

export async function getMyAccountId(): Promise<string | null> {
  try {
    const info = await exec<any>('INSTAGRAM_GET_USER_INFO', { ig_user_id: 'me' });
    return info?.id ?? info?.data?.id ?? null;
  } catch (err) {
    console.error('No se pudo obtener el ID de la cuenta propia:', err);
    return null;
  }
}

export async function listConversations(limit = 25): Promise<IgConversation[]> {
  const raw = await exec('INSTAGRAM_LIST_ALL_CONVERSATIONS', { limit });
  return unwrapList(raw).map((c: any) => ({ id: c.id }));
}

export async function listMessages(conversationId: string, limit = 10): Promise<IgMessage[]> {
  const raw = await exec('INSTAGRAM_LIST_ALL_MESSAGES', {
    conversation_id: conversationId,
    limit,
  });
  return unwrapList(raw).map((m: any) => ({
    id: m.id,
    text: m.message ?? '',
    createdTime: m.created_time,
    fromId: m.from?.id,
    fromUsername: m.from?.username,
  }));
}

export async function sendTextMessage(recipientId: string, text: string): Promise<void> {
  await exec('INSTAGRAM_SEND_TEXT_MESSAGE', { recipient_id: recipientId, text });
}

export async function markSeen(recipientId: string): Promise<void> {
  try {
    await exec('INSTAGRAM_MARK_SEEN', { recipient_id: recipientId });
  } catch (err) {
    // No es crítico: si falla, seguimos igual respondiendo mensajes.
    console.warn('No se pudo marcar como visto:', (err as Error).message);
  }
}
