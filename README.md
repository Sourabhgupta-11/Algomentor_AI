# AlgoMentor AI

An AI-powered competitive-programming mentor. Paste a problem or ask about an
algorithm, pick a **mode** (Hint / Explain / Full Solution / Generate New
Problem), and get a streamed, progressively-rendered response from Google Gemini —
tailored for Codeforces-style prep in C++, Python, Java, or JavaScript.

```
algomentor-ai/
├── backend/          Express server, streams Claude responses via SSE
├── frontend/         React (Vite) chat UI
├── docs/             Concept note + project report (assignment deliverables)
└── docker-compose.yml
```

## 1. Features

- **Streaming responses** — text renders token-by-token, not all at once.
- **Four mentoring modes** so the AI never spoils a problem unless you ask it to.
- **Language-aware code**: choose C++ / Python / Java / JavaScript.
- **Secrets stay server-side**: the API key never reaches the browser or the
  frontend bundle.
- **Responsive UI**: sidebar collapses into a top bar on mobile widths.
- **Dockerized** end-to-end, ready for AWS.

## 2. Local development (without Docker)

### Backend
```bash
cd backend
cp .env.example .env      # then fill in ANTHROPIC_API_KEY
npm install
npm run dev                # http://localhost:8080
```

### Frontend
```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173 (proxies /api to :8080)
```

## 3. Run with Docker Compose (recommended)

```bash
cd algomentor-ai
cp backend/.env.example backend/.env   # fill in your real API key
docker compose up --build
```

- Frontend: http://localhost
- Backend health check: http://localhost:8080/api/health


## 4. Security notes

- `GEMINI_API_KEY` is read only inside `backend/server.js` via
  `process.env` — it is never sent to the client and `.env` is gitignored.
- CORS is restricted via `ALLOWED_ORIGIN` (set this to your real frontend
  domain in production instead of `*`).
- A simple rate limiter (`express-rate-limit`) caps chat requests per IP to
  help control API cost.

## 5. Tech stack

| Layer      | Technology                                  |
|------------|----------------------------------------------|
| Frontend   | React 18, Vite, plain CSS                    |
| Backend    | Node.js 18, Express, Server-Sent Events      |
| AI model   | Google Gemini (`gemini-3.1-flash-lite`)      |
| Container  | Docker (multi-stage build for frontend)      |
| Deployment | AWS App Runner (or Elastic Beanstalk)        |

See `docs/Concept_Note.md` and `docs/Project_Report.md` for the assignment's
required documentation.
