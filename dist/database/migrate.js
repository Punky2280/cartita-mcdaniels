import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import 'dotenv/config';
const runMigrations = async () => {
    console.log("Running database migrations...");
    const databaseUrl = process.env['DATABASE_URL'];
    if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable is required');
    }
    const migrationClient = postgres(databaseUrl, { max: 1 });
    const db = drizzle(migrationClient);
    await migrate(db, { migrationsFolder: './src/database/migrations' });
    await migrationClient.end();
    console.log("✅ Migrations completed successfully.");
};
runMigrations().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
});
