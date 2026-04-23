import postgres, { type Sql } from 'postgres';

export interface TestDatabase {
  enabled: boolean;
  sql: Sql | null;
}

const tableName = 'e2e_gdpr_requests';

export function hasTestDatabase(): boolean {
  return typeof process.env.TEST_DATABASE_URL === 'string' && process.env.TEST_DATABASE_URL.length > 0;
}

export async function setupTestDatabase(): Promise<TestDatabase> {
  if (!hasTestDatabase()) {
    return {
      enabled: false,
      sql: null,
    };
  }

  const sql = postgres(process.env.TEST_DATABASE_URL as string, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
  });

  await sql`
    create table if not exists ${sql(tableName)} (
      email text primary key,
      request_id text not null,
      observed_at timestamptz not null default now()
    )
  `;

  return {
    enabled: true,
    sql,
  };
}

export async function clearTestDatabase(db: TestDatabase): Promise<void> {
  if (!db.enabled || !db.sql) {
    return;
  }

  await db.sql`delete from ${db.sql(tableName)}`;
}

export async function recordGdprRequest(
  db: TestDatabase,
  email: string,
  requestId: string,
): Promise<void> {
  if (!db.enabled || !db.sql) {
    return;
  }

  await db.sql`
    insert into ${db.sql(tableName)} (email, request_id)
    values (${email}, ${requestId})
    on conflict (email)
    do update set
      request_id = excluded.request_id,
      observed_at = now()
  `;
}

export async function getRecordedGdprRequestCount(
  db: TestDatabase,
  email: string,
): Promise<number> {
  if (!db.enabled || !db.sql) {
    return 0;
  }

  const rows = await db.sql<{ count: string }[]>`
    select count(*)::text as count
    from ${db.sql(tableName)}
    where email = ${email}
  `;

  return Number(rows[0]?.count ?? 0);
}

export async function closeTestDatabase(db: TestDatabase): Promise<void> {
  if (!db.enabled || !db.sql) {
    return;
  }

  await db.sql.end({ timeout: 5 });
}
