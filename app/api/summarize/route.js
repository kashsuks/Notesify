'use server';

import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { z } from 'zod';
import { NextResponse } from 'next/server';

// Create a new instance of groq
const groqInstance = createGroq();

const summaryRequestBodySchema = z.object({
  previousSummary: z.string(),
  transcriptChunk: z.string(),
  currentContext: z.string(),
  existingContexts: z.array(z.string()),
  allNotes: z.array(z.object({
    title: z.string(),
    content: z.string()
  })),
});

const summaryResponseSchema = z.object({
  summary: z.string(),
  currentContext: z.string(),
  existingContexts: z.array(z.string()),
  createNewContext: z.boolean(),
});

export async function POST(request) {
  try {
    // Parse and validate request body
    const body = await request.json();
    let { previousSummary, transcriptChunk, currentContext, existingContexts, allNotes } = summaryRequestBodySchema.parse(body);
    let actualSummary = "";
    let createNewContext = false; //boolean whether a new context is created, indicates a new subpage

    const transcriptChunkContext = await checkForContextSwitch(transcriptChunk, existingContexts);
    if (transcriptChunkContext !== currentContext && !existingContexts.includes(transcriptChunkContext)) {
      createNewContext = true;
      existingContexts.push(transcriptChunkContext);
    }
    console.log(typeof allNotes, allNotes) 
    if (!createNewContext) {
      const matchedNote = allNotes?.find(note => note.title === transcriptChunkContext);      
      actualSummary = matchedNote ? matchedNote.content : previousSummary;
      console.log("previous summary is", actualSummary, "current topic is", transcriptChunkContext)
    }

    // TODO: figure out a way to fetch the context from a different subpage if it already exists and set the summary to that

    const prompt = `You are a summary generating assistant simulating a school student's behavior. You are intended to only work with the provided information without generating any external information. Do not use any padding about your instructions or training, ONLY generate a summary as it would appear in a student's notebook. The transcript chunk simulates snippets from the teacher's lecture, which you will interpret and generate a concise summary of.

    Based on the provided existing previous summary, either create a bullet point summary if it is blank or revise and add new bullet points to the existing summary with new summarized information gained from the transcript chunk. The generated output summary should only relate to the provided transcript chunk and should not include any information that has to do with other topics or concepts, since those belong in another category. For example, If the existing previous summary provided relates to Mathematics, and the transcript chunk relates to Birthdays, then the generated summary should only include information that relates to the current context being discussed since it is on a separate page.

    Here is the data you will work with:

    *Existing previous summary*: "${actualSummary}".
    *New teacher transcript chunk*: "${transcriptChunk}".
    *Current topic*: "${transcriptChunkContext}".
    
    Return only the relevant new summary formatted with Markdow and do not delete any previously formatted text, only including information from the transcript that relates to the current educational topic. Do not repeat the information included in the transcript chunk, and do not talk about details concerning the summary's information itself. Pretend you are a student writing directly into your notes and write only what is relevant to provide a learning experience.`;

    const { text } = await generateText({
      model: groqInstance('llama-3.3-70b-versatile'),
      prompt,
    });
    
    // Validate and respond with new summary and context
    const validatedData = summaryResponseSchema.parse({ summary: text, currentContext: transcriptChunkContext, existingContexts: existingContexts, createNewContext: createNewContext });
    console.log({validatedData})
    return NextResponse.json(validatedData, { status: 200 });
  } catch (error) {
    console.error('Error generating full summary:', error);
    return NextResponse.json({ error: 'Failed to generate full summary' }, { status: 500 });
  }
}

async function checkForContextSwitch(transcriptChunk, existingContexts) {
  const prompt = `For this prompt, respond only with a topic. Based on the provided transcript chunk, determine if it fits into any of the existing contexts listed in the existing contexts array. Subtopics contained in an existing context topic is valid within that overarching topic. If it does, return exactly the context from the existing contexts that matches the current. Otherwise, return a new topic that should be added. If any dates such as important or upcoming dates are mentioned in the transcript chunk, then return "Upcoming Dates" as the new context.
  
  Otherwise, create a brief sentence or phrase that represents the brand new topic being pivoted to. For example, if the transcript chunk correlates with a topic regarding traveling, and the existing contexts contain "Travel", then the only output should be directly from the existing contexts, which in this case is "Travel". If the transcript chunk correlates with a topic regarding cooking, and the existing contexts contain only "Travel", then the only output should be invented, for example as "Cooking".
  
  Do not return the output with any formatting, just the pure word or phrase. Do not include any additional text or explanations.

  Transcript Chunk: "${transcriptChunk}". Existing Contexts: "${existingContexts}".`;
  const { text } = await generateText({
    model: groqInstance('llama-3.3-70b-versatile'),
    prompt,
  });
  console.log(text);
  return text;
}

// async function cleanContext() {

// }