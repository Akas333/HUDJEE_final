import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { AUTHOR_BUCKETS } from '@/lib/questionSchema';

/**
 * Estimates a starting difficulty for a freshly authored question, so the adaptive
 * engine has a sensible prior before any student has answered it.
 *
 * This used to POST to `http://127.0.0.1:11434` — a local Ollama install — which
 * meant the button only ever worked on one developer's laptop and failed with a
 * connection error everywhere else. Gemini is what the repo is set up for:
 * `@google/genai` is already a dependency and `GEMINI_API_KEY` is the documented
 * environment variable.
 */

const BUCKET_GUIDE = AUTHOR_BUCKETS.map(
  (b) => `- ${b.value} (b around ${b.b})`
).join('\n');

const VALID_BUCKETS = AUTHOR_BUCKETS.map((b) => b.value);

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not set — add it to apps/cms/.env.local to use AI estimation.' },
      { status: 503 }
    );
  }

  try {
    const { question_body, options, subject } = await request.json();

    if (!question_body?.trim()) {
      return NextResponse.json({ error: 'Write the question first.' }, { status: 400 });
    }

    const optionsText = Array.isArray(options)
      ? options.map((o: any, i: number) => `Option ${i + 1}: ${o?.text ?? ''}`).join('\n')
      : 'No options (numeric or matrix answer).';

    const prompt = `You are an experienced JEE ${subject || ''} teacher and Item Response Theory evaluator.
Estimate how difficult the following question is for a typical JEE aspirant, and give an
initial IRT difficulty parameter b.

Question:
${question_body}

Options:
${optionsText}

Buckets:
${BUCKET_GUIDE}

Respond with only a JSON object: {"author_difficulty_bucket": "medium", "author_prior_b": -0.5}`;

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const text = response.text;
    if (!text) throw new Error('The model returned an empty response.');

    const result = JSON.parse(text);

    // The model is a suggestion, not an authority — clamp it into the range the
    // engine actually accepts rather than writing whatever comes back into the row.
    const bucket = VALID_BUCKETS.includes(result.author_difficulty_bucket)
      ? result.author_difficulty_bucket
      : 'medium';
    const rawB = Number(result.author_prior_b);
    const priorB = Number.isFinite(rawB) ? Math.max(-3, Math.min(3, rawB)) : 0;

    return NextResponse.json({
      author_difficulty_bucket: bucket,
      author_prior_b: priorB,
    });
  } catch (err: any) {
    console.error('AI evaluation error:', err);
    return NextResponse.json(
      { error: err?.message || 'Could not estimate difficulty.' },
      { status: 500 }
    );
  }
}
