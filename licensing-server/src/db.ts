import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const sslEnabled = process.env.DATABASE_URL?.includes('sslmode=require') || process.env.DB_SSL === 'true';

let connectionString = process.env.DATABASE_URL;
if (connectionString && connectionString.includes('?')) {
  // Strip query parameters to prevent pg-connection-string from overriding SSL config
  connectionString = connectionString.split('?')[0];
}

const pool = new Pool({
  connectionString,
  host: connectionString ? undefined : (process.env.DB_HOST || 'localhost'),
  port: connectionString ? undefined : parseInt(process.env.DB_PORT || '5432'),
  user: connectionString ? undefined : (process.env.DB_USER || 'postgres'),
  password: connectionString ? undefined : (process.env.DB_PASSWORD || 'postgres'),
  database: connectionString ? undefined : (process.env.DB_NAME || 'swarnpro_erp_licensing'),
  ssl: sslEnabled ? { rejectUnauthorized: false } : undefined
});

export async function initDatabase() {
  console.log('Connecting to PostgreSQL database...');
  try {
    const client = await pool.connect();
    console.log('PostgreSQL connection established.');

    // Load and execute schema.sql for bootstrapping
    const schemaPath = path.join(__dirname, '../schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await client.query(schemaSql);
      console.log('PostgreSQL tables initialized/verified successfully.');
    } else {
      console.warn('schema.sql not found at', schemaPath, '- skipping bootstrap schema.');
    }
    client.release();
  } catch (err) {
    console.error('Failed to initialize PostgreSQL database:', err);
    throw err;
  }
}

export default pool;
