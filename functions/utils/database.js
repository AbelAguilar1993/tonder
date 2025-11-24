/**
 * Database utility functions for D1 SQLite operations
 * Schema is managed via migrations in /migrations directory
 */

/**
 * Execute a prepared statement
 */
export async function executeQuery(env, query, params = []) {
  try {
    const db = env.DB;
    const stmt = db.prepare(query);

    if (params.length > 0) {
      return await stmt.bind(...params).all();
    }

    return await stmt.all();
  } catch (error) {
    console.error("Database query error:", error);
    throw new Error("Database operation failed");
  }
}

/**
 * Execute a prepared statement and return first result
 */
export async function executeQueryFirst(env, query, params = []) {
  try {
    const db = env.DB;
    const stmt = db.prepare(query);

    if (params.length > 0) {
      return await stmt.bind(...params).first();
    }

    return await stmt.first();
  } catch (error) {
    console.error("Database query error:", error);
    throw new Error("Database operation failed");
  }
}

/**
 * Execute a prepared statement for insert/update/delete
 */
export async function executeUpdate(env, query, params = []) {
  try {
    const db = env.DB;
    const stmt = db.prepare(query);

    if (params.length > 0) {
      return await stmt.bind(...params).run();
    }

    return await stmt.run();
  } catch (error) {
    console.error("Database update error:", error);
    throw new Error("Database operation failed");
  }
}
