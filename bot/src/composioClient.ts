import { Composio } from '@composio/core';
import { config } from './config.js';

export const composio = new Composio({
  apiKey: config.composioApiKey,
});
