export default {
  async fetch(req: Request, env: { ASSETS: Fetcher }) {
    const url = new URL(req.url);
    if (url.pathname === "/api/health") return Response.json({ ok: true });
    return env.ASSETS.fetch(req);
  },
};
