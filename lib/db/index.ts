import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

// biome-ignore lint: Forbidden non-null assertion.
const sqlite = new Database('sqlite.db');
export const db: BetterSQLite3Database = drizzle(sqlite); 