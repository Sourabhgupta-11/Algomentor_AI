# Project Concept Note

## Project Title
AlgoMentor AI — An AI Competitive Programming Coach

## Problem Statement / Objective
Students preparing for competitive programming contests (Codeforces, CSES,
LeetCode) often get stuck between two unhelpful extremes: searching for a
full editorial (which spoils the problem) or having no guidance at all when
they're stuck for hours. There's a gap for a tool that meters how much help
it gives, so learners build intuition rather than copying solutions.

AlgoMentor AI addresses this by offering graduated levels of AI assistance —
hints, concept explanations, full walkthroughs, or freshly generated
practice problems — all in one lightweight web app.

## Target User & Use Case
- Primary user: CS students actively practicing for Codeforces Div. 2 /
  interview-style DSA rounds.
- Use case 1: Stuck on a problem, wants a nudge without spoiling it —
  Hint mode.
- Use case 2: Recognizes a pattern (e.g. "segment tree") but doesn't fully
  understand it — Explain mode.
- Use case 3: Wants to review a clean, complexity-annotated solution after
  already attempting the problem — Solution mode.
- Use case 4: Wants more targeted practice on a topic/difficulty — either
  Generate mode inside the chat, or the dedicated Practice page for a
  structured, standalone problem.

## LLM Model & API Used
Google Gemini (gemini-3.1-flash-lite) via the Gemini API, called
server-side with two different call patterns depending on the feature:
- Streaming (streamGenerateContent, alt=sse) for the chat mentor, so
  responses render token-by-token in the UI.
- Non-streaming (generateContent with a JSON response mime type) for the
  Practice Problem Generator, which needs a single complete, structured
  JSON object rather than free-flowing text.

Gemini was chosen over paid alternatives specifically because Google AI
Studio offers a genuinely free, ongoing tier with no credit card required —
a better fit for a self-funded student project than providers that gate
API access behind billing setup.

## Key Features
1. Four distinct mentoring modes in chat, each with a tailored system
   prompt: Hint, Explain, Full Solution, Generate.
2. A separate Practice Problem Generator page that returns a structured
   problem (title, difficulty, tags, statement, constraints, sample
   input/output, hint) for a chosen topic and difficulty.
3. Per-conversation language preference (C++, Python, Java, or
   JavaScript) for code and hints.
4. Real-time streaming chat responses via Server-Sent Events, with the
   ability to stop generation mid-response or regenerate the last answer.
5. Multiple saved conversations, auto-titled and persisted locally, so
   users can switch between different problems they're working on.
6. Clean, responsive UI with light/dark theme, usable on both desktop and
   mobile.
7. Server-side API key handling with rate limiting for cost control.
8. Fully containerized, deployed on AWS with a public HTTPS URL.

## Expected User Experience & Outcomes
A student opens the app, starts a new chat, selects "Hint" mode and C++,
pastes a problem statement, and receives a short, encouraging nudge in
seconds — text streaming in naturally rather than appearing as one large
delayed block. They can switch to "Explain" once they've had a partial
breakthrough, or head to the Practice page when they want a brand new
problem on the same topic to reinforce the pattern, complete with sample
input/output and a collapsible hint. The end goal is faster skill-building
with less spoiler-driven learning.

## Live Application URL
https://al-ab0c51f0e64b40fb9785c2aa3303089e.ecs.ap-south-1.on.aws


Built by Team S-Virus as part of our IBM internship project.