/**
 * Loads the monorepo-root `.env` into process.env before any other module is
 * evaluated. Must be imported FIRST in main.ts (before AppModule) so that
 * ConfigModule's validation sees the variables regardless of the process cwd.
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';

// From apps/server/dist (compiled) or apps/server/src (ts-node) up to repo root.
config({ path: resolve(__dirname, '../../../.env') });
// Also honor a local .env / real process env without overriding the root values.
config();
