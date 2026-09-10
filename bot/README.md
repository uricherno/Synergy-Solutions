# Asistente de Instagram — Synergy Solutions

Bot que lee los mensajes directos de Instagram de Synergy Solutions, le pasa la conversación a Claude (con la personalidad e información de la agencia) y responde automáticamente.

## Cómo funciona

Cada cierta cantidad de segundos (`POLL_INTERVAL_MS`), el proceso:

1. Lista las conversaciones de Instagram vía Composio.
2. Por cada una, revisa si el último mensaje es del cliente y todavía no fue respondido.
3. Si hay algo nuevo, le pasa el historial a Claude y genera una respuesta.
4. Manda la respuesta por Instagram y la marca como manejada (para no repetirla).

No usa webhooks de Meta: consulta la API cada tanto. Es más simple de poner en marcha, a cambio de que la respuesta tarda hasta `POLL_INTERVAL_MS` en salir (por defecto, 20 segundos) en vez de ser instantánea al milisegundo.

## Requisitos previos

- Tu Instagram tiene que ser cuenta profesional (Business o Creator) vinculada a una Página de Facebook.
- Esa cuenta ya conectada en Composio (lo hicimos juntos desde el chat).

## Configuración

1. Copiá el archivo de variables de entorno:

   ```bash
   cp .env.example .env
   ```

2. Completá `.env` con tus claves:
   - `COMPOSIO_API_KEY`: la sacás en [dashboard.composio.dev](https://dashboard.composio.dev) → Settings → API Keys.
   - `ANTHROPIC_API_KEY`: la sacás en [console.anthropic.com](https://console.anthropic.com) → API Keys.

3. Instalá las dependencias:

   ```bash
   npm install
   ```

## Ejecutar

```bash
npm run dev
```

Vas a ver en la consola cuando detecta un mensaje nuevo y qué respondió. Dejalo corriendo mientras querés que el asistente esté activo; `Ctrl+C` lo detiene.

## Cambiar la personalidad o los servicios que menciona

Todo el "cerebro" del asistente está en un solo lugar: [`src/ai.ts`](src/ai.ts), en la constante `SYSTEM_PROMPT`. Editá ese texto para ajustar el tono, agregar información o cambiar qué servicios ofrece.

## Próximos pasos posibles

- **Multi-cliente**: cuando tengas el primer cliente de Synergy con su propio Instagram, se conecta como una cuenta separada en Composio y este mismo bot (con una configuración por cliente) puede atenderla en paralelo.
- **Deploy 24/7**: para que corra sin depender de esta computadora, se puede subir a un servicio como Railway o Render como "worker" de fondo (no es un sitio web, es un proceso que corre solo).
- **Webhooks en vez de polling**: si más adelante se necesita respuesta instantánea real, hay que dar de alta una app propia en Meta for Developers y recibir los mensajes por webhook en vez de consultarlos.
