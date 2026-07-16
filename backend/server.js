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
    "[WARN] GEMINI_API_KEY is not set. Requests to /api/chat will fail until it is configured in the environment (.env file or AWS environment variables)."
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

// ---- Persona / system prompt -------------------------------------------
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

// ---- Health check --------------------------------------------------------
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", model: MODEL, keyConfigured: Boolean(GEMINI_API_KEY) });
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

    // Set up SSE headers
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
    }
  }
});

app.listen(PORT, () => {
  console.log(`AlgoMentor backend listening on port ${PORT}`);
  console.log(`Using model: ${MODEL}`);
  console.log(`API key configured: ${Boolean(GEMINI_API_KEY)}`);
});