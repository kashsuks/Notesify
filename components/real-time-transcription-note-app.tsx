"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mic, MicOff, Plus, X, Image, Settings } from "lucide-react";
import ReactMarkdown from "react-markdown";
import mermaid from "mermaid";
import SettingsModal from "@/components/SettingsModal";
import katex from "katex";
import "katex/dist/katex.min.css";

const DEBOUNCE_DELAY = 4000;
const CYCLE_DURATION = 2000;

// API call for saving notes
const summarizeNote = async (
    previousSummary: string,
    transcriptChunk: string,
    currentContext: string,
    existingContexts: string[],
    allNotes: any
  ) => {
    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          previousSummary,
          transcriptChunk,
          currentContext,
          existingContexts,
          allNotes,
        }),
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const validatedData = await response.json();
      return {
        success: true,
        existingContexts: [...validatedData.existingContexts],
        currentContext: validatedData.currentContext,
        summary: validatedData.summary,
        createNewContext: validatedData.createNewContext,
        message: "Note summarized successfully",
      };
    } catch (error) {
      console.error("Error summarizing note:", error);
      return {
        success: false,
        subpages: [],
        message: "Failed to summarize note",
      };
    }
  };