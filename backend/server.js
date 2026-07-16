require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 8080;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

if (!ANTHROPIC_API_KEY) {
  console.warn(
    "[WARN] ANTHROPIC_API_KEY is not set. Requests to /api/chat will fail until it is configured in the environment (.env file or AWS environment variables)."
  );
}

app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json({ limit: "1mb" }));

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a moment and try again." },
});

// -------- System prompt -------------------------------------------
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

// ---- Health check --------------------------------------------------------
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", model: MODEL, keyConfigured: Boolean(ANTHROPIC_API_KEY) });
});

// ---- Streaming chat endpoint ---------------------------------------------
app.post("/api/chat", chatLimiter, async (req, res) => {
  try {
    const { messages, mode = "hint", language = "C++" } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "`messages` must be a non-empty array." });
    }
    if (!ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: "Server is missing ANTHROPIC_API_KEY." });
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        system: buildSystemPrompt(mode, language),
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: true,
      }),
    });

    if (!anthropicResponse.ok || !anthropicResponse.body) {
      const errText = await anthropicResponse.text().catch(() => "");
      res.write(`event: error\ndata: ${JSON.stringify({ error: errText || "Upstream error" })}\n\n`);
      return res.end();
    }

    const reader = anthropicResponse.body.getReader();
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
          if (event.type === "content_block_delta" && event.delta?.text) {
            res.write(`event: token\ndata: ${JSON.stringify({ text: event.delta.text })}\n\n`);
          } else if (event.type === "message_stop") {
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
      res.write(`event: error\ndata: ${JSON.stringify({ error: "Internal server error" })}\n\n`);
      res.end();
    } catch {
    }
  }
});

app.listen(PORT, () => {
  console.log(`AlgoMentor backend listening on port ${PORT}`);
});
