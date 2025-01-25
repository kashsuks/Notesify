// make a page that uses the groq.js server action
'use client';
import { groq, createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { streamText } from '@/app/actions/groq';
import { useEffect } from 'react';

// const groq = createGroq();

export default function Page() {

  useEffect(() => {
    useEffectFunction();
  }, []);

  const useEffectFunction = async () => {
    const { text } = await streamText();
    // console.log(text);
  };

  return (
    <div>
      <h1>Groq Page</h1>
      {/* <p>{text}</p> */}
    </div>
  );
} 