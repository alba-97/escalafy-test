import { Pool, type PoolClient, type QueryResultRow } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function getDatabaseUrl(): string {
  const url = process.env.DB_URL;
  if (!url) {
    throw new Error("DB_URL is not set");
  }
  return url;
}

export function getPool(): Pool {
  if (process.env.NODE_ENV !== "production") {
    if (!globalThis.__pgPool) {
      globalThis.__pgPool = new Pool({ connectionString: getDatabaseUrl() });
    }
    return globalThis.__pgPool;
  }

  return new Pool({ connectionString: getDatabaseUrl() });
}

export async function withClient<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[],
): Promise<T[]> {
  const pool = getPool();
  const result = await pool.query<T>(text, params);
  return result.rows;
}
