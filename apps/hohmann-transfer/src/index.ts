import { createApp } from "./app";
import type { Env } from "./env";

const app = createApp();

/** "/x/" -> "/x", "x" -> "/x", "" or "/" -> "". */
export function normaliseBasePath(base: string | undefined): string {
  if (!base) return "";
  const trimmed = base.replace(/\/+$/, "");
  if (trimmed === "") return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

/** Remove BASE_PATH from the request path, so the app only ever sees /health, /api/v1/... */
export function stripBasePath(request: Request, base: string | undefined): Request {
  const prefix = normaliseBasePath(base);
  if (!prefix) return request;
  const url = new URL(request.url);
  if (url.pathname === prefix || url.pathname.startsWith(`${prefix}/`)) {
    url.pathname = url.pathname.slice(prefix.length) || "/";
    return new Request(url, request);
  }
  return request;
}

export default {
  fetch(request, env, ctx) {
    return app.fetch(stripBasePath(request, env.BASE_PATH), env, ctx);
  },
} satisfies ExportedHandler<Env>;
