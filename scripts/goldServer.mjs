import http from "node:http";
import fs from "node:fs/promises";
import { execFile } from "node:child_process";

const PORT = 8787;

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });

  res.end(
    JSON.stringify(payload)
  );
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "POST" || req.url !== "/update-gold") {
    res.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8"
    });
    res.end("Not Found");
    return;
  }

  execFile(
    "node",
    ["scripts/updateGold.mjs"],
    {
      cwd: process.cwd(),
      shell: true,
      encoding: "utf8"
    },
    async (error, stdout, stderr) => {
      if (error) {
        sendJson(res, 500, {
          ok: false,
          error: stderr || error.message
        });

        return;
      }

      try {
        const jsonText = await fs.readFile(
          "public/gold.json",
          "utf-8"
        );

        const data = JSON.parse(jsonText);

        sendJson(res, 200, {
          ok: true,
          stdout,
          data
        });
      } catch (readError) {
        sendJson(res, 500, {
          ok: false,
          error:
            readError instanceof Error
              ? readError.message
              : String(readError)
        });
      }
    }
  );
});

server.listen(PORT, () => {
  console.log(
    `Gold update server: http://localhost:${PORT}`
  );
});