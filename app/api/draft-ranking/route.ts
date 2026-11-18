import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

type EntradaRanking = {
  id: number;
  name: string;
  average: number;
  remaining_budget: number;
  created_at: string;
};

function obtenerSql() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;
  return neon(connectionString);
}

async function asegurarTabla<ArrayMode extends boolean, FullResults extends boolean>(
  sql: NeonQueryFunction<ArrayMode, FullResults>,
) {
  await sql`
    CREATE TABLE IF NOT EXISTS draft_rankings (
      id SERIAL PRIMARY KEY,
      name VARCHAR(24) NOT NULL,
      average NUMERIC(4, 1) NOT NULL,
      remaining_budget BIGINT NOT NULL,
      team_ids TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    INSERT INTO draft_rankings (
      name,
      average,
      remaining_budget,
      team_ids,
      created_at
    )
    SELECT 'Theo', 83.5, 0, '[]', TIMESTAMPTZ '2026-11-16 12:00:00'
    WHERE NOT EXISTS (
      SELECT 1
      FROM draft_rankings
      WHERE name = 'Theo' AND average = 83.5
    )
  `;
}

export async function GET() {
  const sql = obtenerSql();
  if (!sql) {
    return Response.json(
      { error: 'Ranking sin configurar: falta la variable DATABASE_URL de Neon.' },
      { status: 503 },
    );
  }

  try {
    await asegurarTabla(sql);
    const rows = await sql`
      SELECT id, name, average, remaining_budget, created_at
      FROM draft_rankings
      ORDER BY average DESC, remaining_budget DESC, created_at ASC
      LIMIT 50
    `;

    return Response.json({
      ranking: rows.map((row): EntradaRanking => ({
        id: Number(row.id),
        name: String(row.name),
        average: Number(row.average),
        remaining_budget: Number(row.remaining_budget),
        created_at: String(row.created_at),
      })),
    });
  } catch (error) {
    console.error('No se pudo consultar el ranking del Draft:', error);
    return Response.json(
      { error: 'No se pudo consultar el ranking de Neon.' },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const sql = obtenerSql();
  if (!sql) {
    return Response.json(
      { error: 'Ranking sin configurar: falta la variable DATABASE_URL de Neon.' },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const name =
      typeof body.name === 'string'
        ? body.name.trim().replace(/\s+/g, ' ')
        : '';
    const average = Number(body.average);
    const remainingBudget = Number(body.remainingBudget);
    const teamIds: unknown[] = Array.isArray(body.teamIds)
      ? body.teamIds
      : [];

    if (name.length < 2 || name.length > 24) {
      return Response.json(
        { error: 'El nombre debe tener entre 2 y 24 caracteres.' },
        { status: 400 },
      );
    }
    if (!Number.isFinite(average) || average < 45 || average > 99) {
      return Response.json(
        { error: 'La valoración del equipo no es válida.' },
        { status: 400 },
      );
    }
    if (
      !Number.isFinite(remainingBudget) ||
      remainingBudget < 0 ||
      remainingBudget > 100_000_000
    ) {
      return Response.json(
        { error: 'El presupuesto restante no es válido.' },
        { status: 400 },
      );
    }
    if (
      teamIds.length !== 11 ||
      teamIds.some((id) => typeof id !== 'string') ||
      new Set(teamIds).size !== 11
    ) {
      return Response.json(
        { error: 'El plantel debe contener 11 jugadores únicos.' },
        { status: 400 },
      );
    }

    await asegurarTabla(sql);
    const rows = await sql`
      INSERT INTO draft_rankings (name, average, remaining_budget, team_ids)
      VALUES (
        ${name},
        ${average.toFixed(1)},
        ${remainingBudget},
        ${JSON.stringify(teamIds)}
      )
      RETURNING id, name, average, remaining_budget, created_at
    `;

    const row = rows[0];
    return Response.json({
      entrada: {
        id: Number(row.id),
        name: String(row.name),
        average: Number(row.average),
        remaining_budget: Number(row.remaining_budget),
        created_at: String(row.created_at),
      } satisfies EntradaRanking,
    });
  } catch (error) {
    console.error('No se pudo publicar el resultado del Draft:', error);
    return Response.json(
      { error: 'No se pudo guardar el resultado en Neon.' },
      { status: 503 },
    );
  }
}
