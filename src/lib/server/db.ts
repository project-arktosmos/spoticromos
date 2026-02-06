import mysql from 'mysql2/promise';
import { env } from '$env/dynamic/private';
import type { Pool, RowDataPacket, ResultSetHeader, FieldPacket } from 'mysql2/promise';

let pool: Pool;

function getPool(): Pool {
	if (!pool) {
		pool = mysql.createPool({
			host: env.DB_HOST || 'localhost',
			port: Number(env.DB_PORT) || 3306,
			user: env.DB_USER || 'root',
			password: env.DB_PASSWORD || '',
			database: env.DB_NAME || 'spoticromos',
			waitForConnections: true,
			connectionLimit: 10
		});
	}
	return pool;
}

export async function query<T extends RowDataPacket[]>(
	sql: string,
	params?: unknown[]
): Promise<[T, FieldPacket[]]> {
	return getPool().query<T>(sql, params);
}

export async function execute(
	sql: string,
	params?: unknown[]
): Promise<[ResultSetHeader, FieldPacket[]]> {
	return getPool().execute<ResultSetHeader>(sql, params);
}

export { getPool };
