import "dotenv/config";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";

const app = express();
const port = Number(process.env.PORT) || 5000;
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: frontendOrigin }));
app.use(express.json({ limit: "1mb" }));

function requireKey(res, name) {
  const value = process.env[name];
  if (!value) {
    res.status(503).json({ error: `${name} is not configured in backend/.env.` });
    return null;
  }
  return value;
}

async function readProviderResponse(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.error?.message || body?.message || "External provider request failed.";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return body;
}

function route(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res);
    } catch (error) {
      next(error);
    }
  };
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "cricagent-api",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.get("/api/weather", route(async (req, res) => {
  const city = String(req.query.city || "").trim();
  if (!city) {
    return res.status(400).json({ error: "Query parameter city is required." });
  }

  const apiKey = requireKey(res, "WEATHER_API_KEY");
  if (!apiKey) return;

  const url = new URL(process.env.WEATHER_API_URL || "https://api.weatherapi.com/v1/current.json");
  const isOpenWeather = url.hostname.endsWith("openweathermap.org");
  url.searchParams.set(isOpenWeather ? "appid" : "key", apiKey);
  url.searchParams.set("q", city);
  if (isOpenWeather) {
    url.searchParams.set("units", "metric");
  } else {
    url.searchParams.set("aqi", "no");
  }

  const weather = await readProviderResponse(await fetch(url));
  res.json(weather);
}));

app.get("/api/cricket/live", route(async (req, res) => {
  const apiKey = requireKey(res, "CRICKET_API_KEY");
  if (!apiKey) return;

  const url = new URL(process.env.CRICKET_API_URL || "https://api.cricapi.com/v1/currentMatches");
  const isRapidApi = url.hostname.endsWith(".p.rapidapi.com");
  const options = isRapidApi
    ? {
      headers: {
        "x-rapidapi-host": url.hostname,
        "x-rapidapi-key": apiKey,
      },
    }
    : undefined;

  if (!isRapidApi) {
    url.searchParams.set("apikey", apiKey);
    url.searchParams.set("offset", String(req.query.offset || "0"));
  }

  const matches = await readProviderResponse(await fetch(url, options));
  res.json(matches);
}));

app.post("/api/analysis", route(async (req, res) => {
  const apiKey = requireKey(res, "GEMINI_API_KEY");
  if (!apiKey) return;

  const { prompt, match = {} } = req.body || {};
  const requestText = String(prompt || "").trim();
  if (!requestText) {
    return res.status(400).json({ error: "Body field prompt is required." });
  }

  const context = Object.keys(match).length
    ? `\nMatch context: ${JSON.stringify(match)}`
    : "";
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `You are CricAgent, a practical cricket strategy assistant. Answer concisely.\nUser question: ${requestText}${context}`,
        }],
      }],
    }),
  });
  const result = await readProviderResponse(response);
  const text = result.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();

  res.json({ text: text || "No response text was generated.", provider: "gemini", model });
}));

app.use((error, req, res, next) => {
  console.error(error.message);
  res.status(error.status || 500).json({ error: error.message || "Server error." });
});

async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    console.warn("MONGODB_URI is not configured; database features are disabled.");
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected.");
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
  }
}

await connectDatabase();
app.listen(port, () => {
  console.log(`CricAgent API running at http://localhost:${port}/api`);
});
