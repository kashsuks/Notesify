import { createGroq } from '@ai-sdk/groq'; // Import Groq client creator
import { generateText } from 'ai'; // Import text generation function
import { z } from 'zod'; // Import Zod for schema validation

// Initialize the Groq client
const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY, // Fetch API key from environment variables
});

// Define a Zod schema for the response structure
const responseSchema = z.object({
  response: z.string(),
});

// Define a Zod schema for the request body
const requestBodySchema = z.object({
  latex: z.string(), // Use "latex" instead of "prompt" for clarity
});

// Named export for the POST method
export async function POST(request) {
  try {
    // Parse and validate the request body
    const body = await request.json();
    const { latex } = requestBodySchema.parse(body);

    // Generate the solution using the Groq model
    const { text } = await generateText({
      model: groq('mixtral-8x7b-32768'), // Replace with your desired model
      prompt: `Solve the following math problem step by step. Here is the format. Give me the solution in 1 line and then show a step-by-step one line process on how you got to that. LaTeX input: ${latex}`,
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

// Named export for the GET method (optional, for testing)
export async function GET() {
  return new Response(JSON.stringify({ message: 'Use POST to solve math problems' }), {
    headers: { 'Content-Type': 'application/json' },
  });
}