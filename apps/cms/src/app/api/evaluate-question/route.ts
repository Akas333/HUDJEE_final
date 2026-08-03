import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { question_body, options, subject } = await request.json();

    if (!question_body) {
      return NextResponse.json({ error: 'Question body is required' }, { status: 400 });
    }

    const optionsText = options ? options.map((o: any, i: number) => `Option ${i+1}: ${o.text}`).join('\n') : 'No options provided (Subjective)';

    const prompt = `
You are an expert ${subject || 'academic'} teacher and Item Response Theory (IRT) evaluator. 
Please evaluate the following question and assign it an approximate difficulty bucket and an initial IRT 'b' parameter (theta/difficulty).

Question:
${question_body}

Options:
${optionsText}

The buckets are:
- easy (b between -3.0 and -2.0)
- slightly_easy (b between -2.0 and -1.0)
- medium (b between -1.0 and 0.0)
- slightly_medium (b between 0.0 and 1.0)
- slightly_hard (b between 1.0 and 2.0)
- hard (b between 2.0 and 3.0)

Respond ONLY with a raw, valid JSON object in the exact following format, without any markdown formatting or extra text:
{
  "author_difficulty_bucket": "medium",
  "author_prior_b": 0.5
}
`;

    // Call local Ollama instance
    const ollamaRes = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.1', // Ensure they have this installed, or fallback to llama3
        prompt: prompt,
        stream: false,
        format: 'json'
      })
    });

    if (!ollamaRes.ok) {
      throw new Error(`Ollama API error: ${ollamaRes.statusText}. Ensure Ollama is running locally and 'llama3.1' is installed.`);
    }

    const data = await ollamaRes.json();
    const result = JSON.parse(data.response);

    return NextResponse.json({
      author_difficulty_bucket: result.author_difficulty_bucket,
      author_prior_b: result.author_prior_b
    });

  } catch (err: any) {
    console.error('LLM Evaluation error:', err);
    return NextResponse.json({ error: err.message || 'Failed to evaluate question' }, { status: 500 });
  }
}
