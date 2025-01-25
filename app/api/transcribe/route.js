import { Groq } from 'groq-sdk';
import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { NextResponse } from 'next/server';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const groq2 = createGroq();

export async function POST(req) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio');
    const prevTranscription = formData.get('text');

    if (!audioFile) {
      console.error('No audio file received');
      return NextResponse.json({ error: 'No audio file received' }, { status: 400 });
    }

    const convertedFile = new File([audioFile], 'audio.webm', {
      type: 'audio/webm',
    });

    const transcription = await groq.audio.transcriptions.create({
      file: convertedFile,
      model: 'whisper-large-v3',
      response_format: 'json',
      language: 'en',
      temperature: 0.0,
    });

    const prompt = `You are an advanced transcription model. Given the transcription of a previously transcribed audio chunk and the current transcribed audio chunk, your task is to produce a coherent and seamless merged transcription. Ensure that the merged output reads naturally, with appropriate context, transitions, and adjustments to ensure flow between the two chunks.

          Input:

          Previous Transcription: "${prevTranscription}"
          Current Transcription: "${transcription.text}"
          Instructions:

          Combine both the previous and current transcriptions into a single, coherent transcription.
          Adjust any pronouns, tense, or phrasing as needed to ensure a smooth flow between the two parts.
          If there are redundancies or repetitions between the two chunks, consolidate the information for clarity.
          Maintain the overall meaning and content of both transcriptions.
          Produce a response that sounds like a continuous piece of dialogue or narrative.
          Output:

          Provide the coherent, regenerated transcription here. Do not prepend the response with any padding such as a label or instructions.`;

          const { text } = await generateText({
            model: groq2('llama-3.1-70b-versatile'),
            prompt,
          });

    return NextResponse.json({ transcription: text }, { status: 200 });
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return NextResponse.json({ error: 'Failed to transcribe audio' }, { status: 500 });
  }
}
