# CricAgent AI

<div align="center">

### Captain Command Center for AI-Powered Cricket Decisions

**Live conditions. Tactical reasoning. Match-day insights.**

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Connected-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Gemini](https://img.shields.io/badge/Google-Gemini_AI-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)

</div>

## Overview

CricAgent AI is a cricket strategy dashboard that combines a polished command-center interface with live data integrations and generative AI advice. Configure a match scenario, pull current weather and cricket feed data, ask the Captain Agent for tactical guidance, or explore simulated match outcomes and fantasy-team recommendations.

## Highlights

| Feature | What it does |
| --- | --- |
| Captain Agent | Answers tactical match questions using Google Gemini, with local fallback guidance |
| Live Data Sync | Retrieves current weather and cricket-provider responses through the backend |
| Match Dashboard | Builds toss, bowling, field-placement, batting-order, and win-chance insights |
| Simulator | Produces over-by-over scenarios and updated tactical commentary |
| Dream Team | Suggests ranked fantasy picks from the selected squads |
| Secure Backend | Keeps provider credentials on the Express server, outside the browser bundle |

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite, CSS |
| Backend | Node.js, Express |
| Database | MongoDB via Mongoose |
| AI Strategy | Google Gemini API |
| Weather | WeatherAPI.com or OpenWeather |
| Cricket Feed | CricAPI or RapidAPI-hosted Cricbuzz endpoint |

## Application Flow

```text
React dashboard (localhost:5173)
          |
          | HTTP /api/*
          v
Express API (localhost:5001)
    |          |          |
 MongoDB    Gemini     Weather / Cricket providers
```

The frontend defaults to `http://localhost:5001/api`. For a deployed backend, set `VITE_API_BASE_URL` before building the frontend.

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm
- MongoDB Atlas connection string
- Google Gemini API key
- A weather provider API key
- A cricket provider API key

### 1. Clone And Install

```bash
git clone <your-repository-url>
cd "CricAgent AI VS"
npm install
cd backend
npm install
```

### 2. Configure The Backend

Create your private environment file from the safe template:

```bash
cd backend
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Update `backend/.env` with your credentials:

```env
PORT=5001
FRONTEND_ORIGIN=http://localhost:5173

MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cricagent

GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash

WEATHER_API_KEY=your_weather_api_key
WEATHER_API_URL=https://openweathermap.org/api?utm_source=chatgpt.com

CRICKET_API_KEY=your_cricket_api_key
CRICKET_API_URL=https://rapidapi.com/?utm_source=chatgpt.com
```

For WeatherAPI.com, use:

```env
WEATHER_API_URL=https://api.weatherapi.com/v1/current.json
```

RapidAPI-hosted Cricbuzz endpoints are also supported: set `CRICKET_API_URL` to the desired `*.p.rapidapi.com` endpoint and the server will send the required RapidAPI headers.

### 3. Run Locally

Start the backend in one terminal:

```bash
cd backend
npm run dev
```

Start the frontend in another terminal from the project root:

```bash
npm run dev
```

Open:

- Frontend: [http://localhost:5173](http://localhost:5173)
- API health: [http://localhost:5001/api/health](http://localhost:5001/api/health)

### 4. Try The Experience

1. Click **LIVE DATA** to refresh weather and cricket provider status.
2. Ask the **Captain Agent**: `Who should bowl the next over?`
3. Switch between **Dashboard**, **Live Match**, **Simulator**, and **Dream Team** views.

## API Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Verify API status and MongoDB connection state |
| `GET` | `/api/weather?city=Mumbai` | Retrieve live weather information |
| `GET` | `/api/cricket/live` | Retrieve configured cricket feed data |
| `POST` | `/api/analysis` | Request Gemini-powered strategy advice |

Example strategy request:

```bash
curl -X POST http://localhost:5001/api/analysis \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Who should bowl the next over?",
    "match": {
      "team": "India",
      "opponent": "Australia",
      "format": "T20",
      "pitch": "Dry and turning",
      "weather": "Dew expected"
    }
  }'
```

## Project Structure

```text
CricAgent AI VS/
|-- src/
|   |-- main.jsx             # React dashboard and backend integration
|   `-- styles.css           # Interface styling
|-- backend/
|   |-- src/server.js        # Express API and provider requests
|   |-- .env.example         # Safe environment template
|   `-- README.md            # Backend-specific reference
|-- index.html
|-- package.json             # Frontend scripts and dependencies
`-- README.md
```

## Build For Production

```bash
npm run build
```

The optimized frontend bundle is generated in `dist/`. Deploy the backend separately and set `VITE_API_BASE_URL` to its public API URL before producing the frontend build.

## Security Notes

- Never commit `backend/.env` or paste credentials into documentation.
- Keep only placeholders in `backend/.env.example`.
- Rotate keys immediately if any credential is exposed in Git history, screenshots, logs, or chat.
- Restrict CORS in production by setting `FRONTEND_ORIGIN` to your deployed frontend origin.

## Future Improvements

- Normalize cricket-provider responses into a dedicated live score view.
- Add authentication and persisted match sessions.
- Add automated frontend and backend test coverage.
- Deploy the frontend and API with environment-specific configuration.

---

<div align="center">

Built for captains who want data-backed decisions before the next ball is bowled.

</div>
