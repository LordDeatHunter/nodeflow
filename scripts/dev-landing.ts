import { join } from "node:path";

// Serves the same landing page that build-examples deploys to GitHub Pages.
// Its cards link to relative folder paths (e.g. "familytree/"); in dev each of those
// redirects to the example's own Vite server. Keep in sync with each examples/*/vite.config.ts.
const PORT = 3000;
const htmlPath = join(import.meta.dir, "landing.html");

const DEV_PORTS: Record<string, number> = {
  blueprint: 3001,
  familytree: 3002,
  nostyle: 3003,
  VanillaApp: 3004,
  ReactApp: 3005,
  SvelteApp: 3006,
  VueApp: 3007,
};

Bun.serve({
  port: PORT,
  fetch(request) {
    const folder = new URL(request.url).pathname.split("/").filter(Boolean)[0];
    const port = folder ? DEV_PORTS[folder] : undefined;
    if (port) {
      return Response.redirect(`http://localhost:${port}/`, 302);
    }

    return new Response(Bun.file(htmlPath), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  },
});

console.log(`Nodeflow dev landing page -> http://localhost:${PORT}`);
