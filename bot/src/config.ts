import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Copiá .env.example a .env y completá tus claves.`
    );
  }
  return value;
}

export const config = {
  composioApiKey: required('COMPOSIO_API_KEY'),
  anthropicApiKey: required('ANTHROPIC_API_KEY'),
  composioUserId: process.env.COMPOSIO_USER_ID || 'default',
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS || 20000),
  websiteUrl: process.env.WEBSITE_URL || 'https://synergy-solutions-six.vercel.app/',
  whatsappNumber: process.env.WHATSAPP_NUMBER || '5491128981201',
};
