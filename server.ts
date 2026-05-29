import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

// Pre-load environmental secrets
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parsing parser handles structural JSON payloads safely
  app.use(express.json());

  // Proxy route for resilient, secure LLM conversations
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, model } = req.body;

      // Prioritize primary secret configurations
      const apiKey = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY || "";

      if (!apiKey) {
        return res.status(401).json({
          error: {
            message: "No OpenRouter API key configured on this server. Please set the OPENROUTER_API_KEY secret in your platform Settings.",
            code: 401
          }
        });
      }

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://github.com",
          "X-Title": "ChatBuddy",
        },
        body: JSON.stringify({
          model,
          messages,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        let parsedErr;
        try {
          parsedErr = JSON.parse(errText);
        } catch {
          // Not JSON format
        }
        const remoteMsg = parsedErr?.error?.message || parsedErr?.message || errText;
        return res.status(response.status).json({
          error: {
            message: `OpenRouter Returned Error: ${remoteMsg}`,
            code: response.status
          }
        });
      }

      const data = await response.json();
      return res.json(data);
    } catch (error: any) {
      console.error("Express API Proxy Exception:", error);
      return res.status(500).json({
        error: {
          message: error.message || "Internal server proxy error processing chat completions",
          code: 500
        }
      });
    }
  });

  // Serve static assets based on runtime node environment
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting backend with Vite middleware in development...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Production static serving active from /dist folder...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server successfully running on port ${PORT}`);
  });
}

startServer();
