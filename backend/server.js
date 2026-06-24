import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createTaskStore, ValidationError } from "./tasks.js";

const rootDir = join(fileURLToPath(new URL("..", import.meta.url)));
const frontendDir = join(rootDir, "frontend");
const port = Number(process.env.PORT || 3000);
const store = createTaskStore([
  { title: "Read spec/hardness.md", completed: true },
  { title: "Run validation before archive", completed: false }
]);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

export function createApp(taskStore = store) {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://localhost");

      if (url.pathname === "/api/health" && request.method === "GET") {
        return sendJson(response, 200, { ok: true });
      }

      if (url.pathname === "/api/tasks" && request.method === "GET") {
        return sendJson(response, 200, { tasks: taskStore.list() });
      }

      if (url.pathname === "/api/tasks" && request.method === "POST") {
        const body = await readJson(request);
        return sendJson(response, 201, { task: taskStore.create(body) });
      }

      const toggleMatch = url.pathname.match(/^\/api\/tasks\/(\d+)\/toggle$/);
      if (toggleMatch && request.method === "POST") {
        const task = taskStore.toggle(toggleMatch[1]);
        if (!task) {
          return sendJson(response, 404, { error: "Task not found." });
        }
        return sendJson(response, 200, { task });
      }

      if (url.pathname.startsWith("/api/")) {
        return sendJson(response, 404, { error: "Route not found." });
      }

      return serveStatic(url.pathname, response);
    } catch (error) {
      if (error instanceof ValidationError) {
        return sendJson(response, error.statusCode, { error: error.message });
      }
      if (error instanceof SyntaxError) {
        return sendJson(response, 400, { error: "Invalid JSON body." });
      }

      console.error("request_failed", {
        method: request.method,
        url: request.url,
        message: error.message
      });
      return sendJson(response, 500, { error: "Internal server error." });
    }
  });
}

async function serveStatic(pathname, response) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const safePath = normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(frontendDir, safePath);

  if (!filePath.startsWith(frontendDir)) {
    return sendJson(response, 403, { error: "Forbidden." });
  }

  try {
    const content = await readFile(filePath);
    response.writeHead(200, {
      "content-type": mimeTypes[extname(filePath)] || "application/octet-stream",
      "cache-control": "no-store"
    });
    response.end(content);
  } catch {
    sendJson(response, 404, { error: "File not found." });
  }
}

async function readJson(request) {
  let data = "";
  for await (const chunk of request) {
    data += chunk;
    if (data.length > 16_384) {
      throw new ValidationError("Request body is too large.");
    }
  }
  return data ? JSON.parse(data) : {};
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createApp().listen(port, () => {
    console.log(`SpecCoding vertical slice running at http://localhost:${port}`);
  });
}
