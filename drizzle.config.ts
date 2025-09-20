import type { Config } from 'drizzle-kit';
import 'dotenv/config';

export default {
  schema: './src/database/schema/index.ts',
  out: './src/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  }
} satisfies Config;
