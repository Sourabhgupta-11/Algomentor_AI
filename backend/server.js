/**
 * AlgoMentor AI - Backend Server
 * ---------------------------------
 * Express server that:
 *  - Serves a JSON REST endpoint for chat
 *  - Streams responses from the Google Gemini API to the client via
 *    Server-Sent Events (SSE) so the UI can render text progressively.
 *  - Serves a non-streaming JSON endpoint for generating structured
 *    practice problems (used by the Practice page).
 *  - Keeps the GEMINI_API_KEY strictly on the server side (never sent
 *    to the frontend or committed to version control).
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 8080;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

if (!GEMINI_API_KEY) {
  console.warn(
    "[WARN] GEMINI_API_KEY is not set. Requests to /api/chat and /api/problems/generate will fail until it is configured in the environment (.env file or your cloud service's environment variables)."
  );
}

app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json({ limit: "1mb" }));

// Basic rate limiting to stay comfortably within Gemini's free-tier daily quota.
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a moment and try again." },
});

const problemLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a moment and try again." },
});

// ---- Persona / system prompt (chat) --------------------------------------
const MODE_INSTRUCTIONS = {
  hint: "The student wants a HINT only. Do NOT give the full solution or working code. Nudge them toward the right idea, algorithm family, or observation. Ask a guiding question if useful.",
  explain: "The student wants a CONCEPT EXPLAINED. Explain the underlying algorithm/data structure clearly with a small illustrative example. You may include short pseudocode, but keep it educational rather than a copy-paste solution.",
  solution: "The student wants a FULL WALKTHROUGH. Explain the approach, time/space complexity, and then provide clean, correctly commented code in the language they specify (default C++). Mention edge cases and how you'd stress-test it.",
  generate: "The student wants a NEW PRACTICE PROBLEM generated at a given difficulty/topic (Codeforces Div. 2 style by default). Provide: problem statement, constraints, sample input/output, and (only if asked) a hidden hint section clearly marked as spoilers.",
};

function buildSystemPrompt(mode, language) {
  const modeInstruction = MODE_INSTRUCTIONS[mode] || MODE_INSTRUCTIONS.hint;
  return `You are AlgoMentor, an expert competitive programming coach who mentors students preparing for Codeforces-style contests and technical interviews.

Preferred language for code unless the student says otherwise: ${language || "C++"}.

Teaching style:
- Be encouraging but precise. Prioritize building intuition over dumping answers.
- Use clear structure: short paragraphs, bullet points, and code blocks where helpful.
- Always mention time and space complexity when discussing an approach.
- When relevant, suggest how to stress-test a solution (e.g. brute force + random generator comparison).

Current mode instruction: ${modeInstruction}`;
}

function toGeminiContents(messages) {
  return messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
}

// ---- Static topic list (used by the Practice page) -----------------------
const TOPICS = [
  { id: "arrays", label: "Arrays & Strings" },
  { id: "two-pointers", label: "Two Pointers / Sliding Window" },
  { id: "greedy", label: "Greedy" },
  { id: "dp", label: "Dynamic Programming" },
  { id: "graphs", label: "Graphs (BFS/DFS)" },
  { id: "shortest-path", label: "Shortest Paths (Dijkstra/Bellman-Ford)" },
  { id: "trees", label: "Trees" },
  { id: "segment-tree", label: "Segment Trees / Fenwick Trees" },
  { id: "binary-search", label: "Binary Search" },
  { id: "number-theory", label: "Number Theory" },
  { id: "combinatorics", label: "Combinatorics & Probability" },
  { id: "string-algos", label: "String Algorithms (KMP, Z-function)" },
  { id: "data-structures", label: "Data Structures (Stacks/Queues/Heaps)" },
  { id: "bitmasking", label: "Bitmasking" },
];

const DIFFICULTIES = ["Div. 2 A", "Div. 2 B", "Div. 2 C", "Div. 2 D", "Div. 1 A/B"];

// ---- Health check --------------------------------------------------------
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", model: MODEL, keyConfigured: Boolean(GEMINI_API_KEY) });
});

// ---- Topics list (static metadata for the Practice page) -----------------
app.get("/api/topics", (req, res) => {
  res.json({ topics: TOPICS, difficulties: DIFFICULTIES });
});

// ---- Streaming chat endpoint ---------------------------------------------
app.post("/api/chat", chatLimiter, async (req, res) => {
  try {
    const { messages, mode = "hint", language = "C++" } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "`messages` must be a non-empty array." });
    }
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "Server is missing GEMINI_API_KEY. Add it to backend/.env and restart the server." });
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

    let geminiResponse;
    try {
      geminiResponse = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: buildSystemPrompt(mode, language) }] },
          contents: toGeminiContents(messages),
          generationConfig: { maxOutputTokens: 1500 },
        }),
      });
    } catch (networkErr) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: `Network error reaching Gemini API: ${networkErr.message}` })}\n\n`);
      return res.end();
    }

    if (!geminiResponse.ok || !geminiResponse.body) {
      let errDetail = "";
      try {
        const errJson = await geminiResponse.json();
        errDetail = errJson?.error?.message || JSON.stringify(errJson);
      } catch {
        errDetail = await geminiResponse.text().catch(() => "Unknown upstream error");
      }
      console.error(`[Gemini API error] status=${geminiResponse.status} detail=${errDetail}`);
      res.write(
        `event: error\ndata: ${JSON.stringify({
          error: `Gemini API returned ${geminiResponse.status}: ${errDetail}`,
        })}\n\n`
      );
      return res.end();
    }

    const reader = geminiResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const dataStr = line.slice(5).trim();
        if (!dataStr) continue;

        try {
          const event = JSON.parse(dataStr);
          const text = event?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            res.write(`event: token\ndata: ${JSON.stringify({ text })}\n\n`);
          }
          const finishReason = event?.candidates?.[0]?.finishReason;
          if (finishReason) {
            res.write(`event: done\ndata: {}\n\n`);
          }
        } catch {
          // ignore malformed SSE line
        }
      }
    }

    res.end();
  } catch (err) {
    console.error("Chat stream error:", err);
    try {
      res.write(`event: error\ndata: ${JSON.stringify({ error: `Internal server error: ${err.message}` })}\n\n`);
      res.end();
    } catch {
      // response may already be closed
    }
  }
});

// ---- Practice problem generator (non-streaming, structured JSON) --------
app.post("/api/problems/generate", problemLimiter, async (req, res) => {
  try {
    const { topic = "arrays", difficulty = "Div. 2 B", language = "C++" } = req.body;

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "Server is missing GEMINI_API_KEY. Add it to backend/.env and restart the server." });
    }

    const prompt = `Generate ONE original competitive programming practice problem.

Topic focus: ${topic}
Target difficulty: ${difficulty} (Codeforces-style)
Solution language for the hint: ${language}

Respond with ONLY a raw JSON object (no markdown fences, no commentary) matching exactly this shape:
{
  "title": "string",
  "difficulty": "string",
  "tags": ["string", "string"],
  "statement": "string (the full problem statement, 2-4 paragraphs)",
  "constraints": "string (bullet-style constraints as plain text with newlines)",
  "sampleInput": "string",
  "sampleOutput": "string",
  "hint": "string (one short hint, no full solution or code)"
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    let geminiResponse;
    try {
      geminiResponse = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 1200,
            responseMimeType: "application/json",
          },
        }),
      });
    } catch (networkErr) {
      return res.status(502).json({ error: `Network error reaching Gemini API: ${networkErr.message}` });
    }

    if (!geminiResponse.ok) {
      let errDetail = "";
      try {
        const errJson = await geminiResponse.json();
        errDetail = errJson?.error?.message || JSON.stringify(errJson);
      } catch {
        errDetail = await geminiResponse.text().catch(() => "Unknown upstream error");
      }
      console.error(`[Gemini API error] status=${geminiResponse.status} detail=${errDetail}`);
      return res.status(502).json({ error: `Gemini API returned ${geminiResponse.status}: ${errDetail}` });
    }

    const data = await geminiResponse.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return res.status(502).json({ error: "The AI returned an empty response. Try again." });
    }

    let problem;
    try {
      problem = JSON.parse(rawText);
    } catch {
      console.error("[Problem generator] Failed to parse JSON:", rawText);
      return res.status(502).json({ error: "The AI returned malformed data. Try again." });
    }

    res.json({ problem });
  } catch (err) {
    console.error("Problem generation error:", err);
    res.status(500).json({ error: `Internal server error: ${err.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`AlgoMentor backend listening on port ${PORT}`);
  console.log(`Using model: ${MODEL}`);
  console.log(`API key configured: ${Boolean(GEMINI_API_KEY)}`);
});