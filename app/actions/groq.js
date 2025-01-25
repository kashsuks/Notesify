'use server';
import { groq, createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';

const groqClient = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function streamText() {
  const { text } = await generateText({
    model: groqClient('llama-3.1-8b-instant'),
    prompt: 'Write a vegetarian lasagna recipe for 4 people.',
  });

  console.log("PRINTING NOW");
  console.log(text);
}