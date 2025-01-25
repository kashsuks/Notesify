'use server';

import { groq } from '@ai-sdk/groq';
import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { z } from 'zod';

// Create a new instance of groq
const groqInstance = createGroq();

// Define a Zod schema for the response structure
const responseSchema = z.object({
  response: z.string(),
});

// Define a Zod schema for the request body
const requestBodySchema = z.object({
  prompt: z.string(),
});

export async function POST(request) {
  try {
    // Parse and validate the request body
    const body = await request.json();
    const { prompt } = requestBodySchema.parse(body);

    // Generate the text using the provided model and user prompt
    const { text } = await generateText({
      model: groqInstance('gemma2-9b-it'),
      prompt,
    });

    // Validate the generated text against the schema
    const validatedData = responseSchema.parse({ response: text });

    // Respond with the validated data in JSON format
    return new Response(JSON.stringify(validatedData), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating response:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate response' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}