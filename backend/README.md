# CricAgent Backend

Express API server for secret provider keys and MongoDB access.

## Setup

1. Duplicate `.env.example` as `.env` and replace placeholder values.
2. Install dependencies with `npm install`.
3. Start the API with `npm run dev`.

The frontend stays at `http://localhost:5173`; this local API runs at
`http://localhost:5001`. The frontend uses that URL by default, or accepts
`VITE_API_BASE_URL` when deploying the API elsewhere.

## Endpoints

```text
GET  /api/health
GET  /api/weather?city=Mumbai
GET  /api/cricket/live
POST /api/analysis
```

Example Gemini request:

```json
{
  "prompt": "Who should bowl the next over?",
  "match": {
    "team": "India",
    "opponent": "Australia",
    "format": "T20",
    "weather": "Dew expected"
  }
}
```

`WEATHER_API_URL` supports WeatherAPI.com and OpenWeather current weather
endpoints. `CRICKET_API_URL` supports CricAPI and RapidAPI-hosted Cricbuzz
endpoints.
