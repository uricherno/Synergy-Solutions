import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.join(__dirname, '..', 'data', 'state.json');

type State = Record<string, { lastMessageId: string }>;

let cache: State | null = null;

async function load(): Promise<State> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(STATE_FILE, 'utf-8');
    cache = JSON.parse(raw) as State;
  } catch {
    cache = {};
  }
  return cache;
}

async function save(state: State): Promise<void> {
  cache = state;
  await fs.mkdir(path.dirname(STATE_FILE), { recursive: true });
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

/** Último mensaje de cliente que ya fue respondido en esta conversación. */
export async function getLastMessageId(conversationId: string): Promise<string | undefined> {
  const state = await load();
  return state[conversationId]?.lastMessageId;
}

export async function setLastMessageId(conversationId: string, messageId: string): Promise<void> {
  const state = await load();
  state[conversationId] = { lastMessageId: messageId };
  await save(state);
}
