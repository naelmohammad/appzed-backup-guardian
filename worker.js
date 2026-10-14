/**
 * AppZed backup-guardian (managed=true). Record backup completions, verify
 * freshness per target on daily cron, flag stale targets. Schema
 * self-initializes. Bindings: DB (d1). No AI needed.
 */
const SCHEMA = "CREATE TABLE IF NOT EXISTS backups (id TEXT PRIMARY KEY, target TEXT, bytes INTEGER DEFAULT 0, ok INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')))";
const STALE_AFTER_HOURS = 25;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return Response.json({ ok: true, solution: "backup-guardian" });
    }
    if (request.method === "POST" && url.pathname === "/backups") {
      const body = await request.json().catch(() => null);
      if (!body || !body.target) return bad("backup target is required.");
      const id = crypto.randomUUID();
      await env.DB.exec(SCHEMA);
      await env.DB.prepare(
        "INSERT INTO backups (id, target, bytes, ok) VALUES (?, ?, ?, ?)"
      ).bind(id, body.target, Number(body.bytes || 0), body.ok === false ? 0 : 1).run();
      return Response.json({ id }, { status: 201 });
    }
    if (request.method === "GET" && url.pathname === "/status") {
      await env.DB.exec(SCHEMA);
      const rows = await env.DB.prepare(
        `SELECT target, MAX(created_at) AS last_backup,
          SUM(CASE WHEN ok = 0 THEN 1 ELSE 0 END) AS failures,
          CAST((julianday('now') - julianday(MAX(created_at))) * 24 AS INTEGER) AS hours_since
         FROM backups GROUP BY target ORDER BY target ASC`
      ).all();
      const targets = (rows.results || []).map((r) => ({
        ...r,
        stale: (r.hours_since ?? 0) > STALE_AFTER_HOURS,
      }));
      return Response.json({ targets, stale_after_hours: STALE_AFTER_HOURS });
    }
    return new Response("Not found", { status: 404 });
  },

  async scheduled(event, env) {
    await env.DB.exec(SCHEMA);
    const rows = await env.DB.prepare(
      `SELECT target, MAX(created_at) AS last_backup,
        CAST((julianday('now') - julianday(MAX(created_at))) * 24 AS INTEGER) AS hours_since
       FROM backups GROUP BY target`
    ).all();
    const stale = (rows.results || []).filter((r) => (r.hours_since ?? 0) > STALE_AFTER_HOURS);
    return Response.json({
      checked: (rows.results || []).length,
      stale: stale.map((r) => ({ target: r.target, hours_since: r.hours_since })),
    });
  },
};

function bad(message) {
  return Response.json({ error: message }, { status: 400 });
}
