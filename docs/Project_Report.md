# Project Report — AlgoMentor AI

## 1. Application Overview & Tech Stack

AlgoMentor AI is a full-stack, AI-powered web application that mentors users
through competitive programming problems at four levels of assistance:
Hint, Explain, Full Solution, and Generate New Problem. It also includes a
dedicated Practice Problem Generator page backed by a separate, non-streaming
API route.

| Layer | Technology | Reasoning |
|---|---|---|
| Frontend | React 18 + Vite | Fast dev server, small production bundle, easy SSE consumption with fetch + ReadableStream |
| Backend | Node.js + Express | Simple, well-understood streaming support via native fetch to the Gemini API |
| AI | Google Gemini API (gemini-3.1-flash-lite), streaming mode | Genuine free tier with no billing setup required, strong reasoning and code generation quality, first-class streaming support |
| Container | Docker (2 images: backend, frontend+nginx) | Matches the assignment's containerization requirement and keeps services independently deployable |
| Cloud | AWS ECS (Express Mode), ECR-backed images | Minimal infra to manage, automatic load balancing and HTTPS, public HTTPS out of the box |

## 2. Prompting Strategy & Frameworks Used

The project itself was built using a Vibe Coding workflow: iterative,
conversational prompting to an AI coding assistant to scaffold, wire, and
refine each layer, followed by manual review and adjustment for correctness
and security (e.g. ensuring the API key never leaked into frontend code).

Sample prompts used during development (paraphrased):
- "Scaffold an Express server with a POST /api/chat route that proxies to
  the Gemini streamGenerateContent endpoint using alt=sse, and forwards the
  tokens to the client via Server-Sent Events."
- "Build a React chat UI with a header dropdown for mode/language selection
  and a main panel that reads the SSE stream and appends tokens to the last
  assistant message as they arrive."
- "Write four different system-prompt instructions for a competitive
  programming mentor persona: hint-only, concept explanation, full
  walkthrough with complexity analysis, and new-problem generation."
- "Add a non-streaming POST /api/problems/generate route that calls Gemini's
  generateContent endpoint with responseMimeType set to application/json,
  and returns a structured problem object instead of free text."
- "Add a multi-stage Dockerfile for the Vite frontend that builds static
  assets and serves them via nginx."

Within the product itself, prompt engineering is embedded as the core
feature: each mode maps to a distinct system prompt (see backend/server.js,
MODE_INSTRUCTIONS) that constrains how much the model reveals — this is the
main "prompt engineering" artifact evaluated by this assignment, separate
from the meta-level prompts used to build the app. The problem generator
route uses a second, structurally different prompt that forces the model
into a strict JSON schema rather than a conversational reply.

## 3. Phase-by-Phase Development Summary

1. Concept and scoping — chose a mentor/coach framing over a generic chat
   bot so the app has a clear, differentiated value proposition tied to a
   real personal use case (competitive programming practice).
2. Backend scaffolding — Express server, /api/health and /api/chat routes,
   .env-based secret management.
3. Streaming integration — implemented manual SSE parsing of the Gemini
   streaming response and re-emission to the client as a second SSE stream,
   so the browser never talks to Gemini directly.
4. Frontend UI — chat window, mode/language controls, streaming render loop
   using ReadableStream.getReader().
5. AI provider migration — the project was initially built against the
   Anthropic Claude API, but was switched to Google Gemini partway through
   development. Google AI Studio offers a genuinely free, ongoing tier with
   no credit card required, which was a better fit for a student project
   than Anthropic's card-gated trial credit.
6. Styling and responsiveness — dark/light theme system, header controls
   that collapse into a mobile-friendly layout under 720px width.
7. Feature expansion — added multi-conversation chat history (persisted in
   localStorage), stop/regenerate controls, lightweight markdown rendering
   for responses, and a dedicated Practice page backed by the new
   /api/problems/generate and /api/topics routes.
8. Containerization — separate Dockerfiles for backend (plain Node image)
   and frontend (multi-stage build to nginx), plus a docker-compose.yml for
   local integration testing.
9. Cloud deployment — pushed both images to Amazon ECR. The project
   originally targeted AWS App Runner, but AWS announced App Runner would
   stop accepting new customers as of April 30, 2026 partway through
   deployment. The project was redeployed on Amazon ECS (Express Mode)
   instead, per AWS's own migration guidance, as two independent services.
   ALLOWED_ORIGIN and VITE_API_BASE_URL were configured so the two services
   can reach each other over HTTPS.
10. Hardening — added express-rate-limit to protect API spend on both the
    chat and problem-generation endpoints, and confirmed no secrets exist in
    the frontend bundle by inspecting the built JS output.

## 4. Application Architecture

    Browser (React SPA, static build served by nginx)
              |  HTTPS (REST + SSE)
              v
    Backend (Node/Express, AWS ECS Express Mode)
      - /api/chat               (SSE, streaming)
      - /api/problems/generate  (JSON, non-streaming)
      - /api/topics
      - /api/health
              |  HTTPS
              v
    Google Gemini API
      (streamGenerateContent for chat, generateContent for problem generation)

- The browser never holds the Gemini API key — only the backend container
  does, injected as an environment variable on the ECS task.
- Chat state (message history, per-conversation mode/language) lives in the
  browser's localStorage on the client; the backend is fully stateless per
  request, which keeps horizontal scaling trivial and avoids needing a
  database.
- SSE was chosen over WebSockets for the chat endpoint because the
  interaction is one-directional (server to client token stream) and SSE
  requires no extra infrastructure beyond plain HTTP.
- The problem generator endpoint deliberately does not stream — it needs a
  complete, parseable JSON object before returning, so it uses Gemini's
  non-streaming generateContent call with a JSON response mime type instead.

## 5. Challenges Encountered & Resolutions

- Double-streaming complexity: the backend has to both consume a streaming
  response from Gemini and produce its own SSE stream to the browser.
  Resolved by manually parsing the upstream data: lines with a buffered
  line-splitter and re-emitting only the text deltas from each
  candidates[0].content.parts[0].text field.
- AI provider migration mid-project: switching from Anthropic to Gemini
  required reworking the request/response shape (Gemini uses a top-level
  systemInstruction field and a contents array with role "model" instead of
  "assistant", rather than Anthropic's messages array), and re-verifying
  that the SSE re-emission logic still worked correctly against the new
  provider's event format.
- CORS and proxy mismatch in production: the nginx.conf API proxy initially
  assumed a Docker Compose network (backend:8080), which doesn't exist when
  frontend and backend are deployed as independent cloud services. Resolved
  by removing the proxy entirely and adding a build-time VITE_API_BASE_URL
  so the frontend calls the backend's public URL directly.
- Deployment platform change mid-project: AWS App Runner, the originally
  planned deployment target, stopped accepting new customers during
  development. Migrated to Amazon ECS (Express Mode) instead, which uses a
  similar container-registry-based flow but required re-learning the
  console steps for image selection, environment variables, and health
  checks.
- Stale deployments after pushing new images: ECS resolves an image tag to
  a specific digest at deploy time and does not automatically pick up new
  pushes to the same tag. This caused a live bug fix to appear "not
  applied" even after a successful docker push, until the service was
  explicitly updated to the new image digest/tag through the console.
  Resolved by using unique version tags per build going forward and always
  explicitly triggering a redeploy after pushing.
- Cost control: streaming chat and problem-generation endpoints can be
  abused to run up API usage. Added express-rate-limit on both routes as a
  guardrail.

## 6. Key Learnings & Reflection

Building a small but "real" streaming AI product surfaced details that
don't show up in a simple non-streaming demo: buffering partial SSE lines,
keeping the API key strictly server-side, and making the two-service cloud
topology (frontend/backend as separate containers) actually talk to each
other in production versus local Docker Compose. Switching AI providers
partway through development reinforced the value of keeping the AI-calling
logic isolated in one backend module — the frontend and the rest of the
system required no changes at all when the underlying model provider
changed. The mode-based system prompt design was the most direct
application of prompt engineering principles from the course — constraining
the model's behavior through explicit instructions rather than relying on
the user to phrase their request carefully every time. Finally, the
unplanned AWS App Runner deprecation was a useful lesson in treating cloud
platform choices as something to verify against current documentation
rather than assume static, since managed services can be sunset with
relatively short notice.

## 7. Live Application URL

https://al-ab0c51f0e64b40fb9785c2aa3303089e.ecs.ap-south-1.on.aws