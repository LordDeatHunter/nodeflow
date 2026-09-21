import { join } from "node:path";

const PORT = 3000;
const htmlPath = join(import.meta.dir, "dev-landing.html");

Bun.serve({
  port: PORT,
  fetch() {
    return new Response(Bun.file(htmlPath), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  },
});

console.log(`Nodeflow dev landing page -> http://localhost:${PORT}`);
