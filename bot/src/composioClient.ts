import { Composio } from '@composio/core';
import { config } from './config.js';

export const composio = new Composio({
  apiKey: config.composioApiKey,
});

export async function execTool<T = unknown>(
  slug: string,
  args: Record<string, unknown>
): Promise<T> {
  const result = await composio.tools.execute(slug, {
    userId: config.composioUserId,
    arguments: args,
  });
  if (!result.successful) {
    throw new Error(`${slug} falló: ${JSON.stringify(result.error)}`);
  }
  return result.data as T;
}
