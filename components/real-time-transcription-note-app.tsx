"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useUser } from '@auth0/nextjs-auth0/client';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mic, MicOff, Plus, X, Image, Settings } from "lucide-react";
import ReactMarkdown from "react-markdown";
import DiagramGenerator from "@/components/diagram-generator";
import mermaid from "mermaid";
import DiagramModal from '@/components/diagram-modal';
import SettingsModal from "@/components/SettingsModal";
import katex from "katex";
import "katex/dist/katex.min.css";
import { Menu } from "lucide-react";
import QuizModal from "@/components/QuizModal";
import { GumloopClient } from "gumloop";
import OutputOverlay from "@/components/OutputOverlay"; // Import OutputOverlay




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

// API call for transcribing audio chunks
const transcribeAudioChunk = async (audioChunk: Blob, text: string) => {
    try {
        const formData = new FormData();
        formData.set("audio", audioChunk, "audio.webm");
        formData.append("text", text);

        const response = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return { text: result.transcription };
    } catch (error) {
        console.error("Error transcribing audio chunk:", error);
        throw error;
    }
};

interface Diagram {
    id: string;
    code: string;
    text: string;
}

interface Note {
    title: string;
    content: string;
    diagrams: Diagram[];
}

const protectLaTeX = (content: string) => {
    const latexBlocks: string[] = [];
    const protectedContent = content.replace(/\$\$.*?\$\$|\$.*?\$/g, (match) => {
        latexBlocks.push(match);
        return `@@LaTeX${latexBlocks.length - 1}@@`;
    });
    return { protectedContent, latexBlocks };
};

const restoreLaTeX = (content: string, latexBlocks: string[]) => {
    return content.replace(/@@LaTeX(\d+)@@/g, (_, index) => latexBlocks[Number(index)]);
};

const NoteEditor = React.memo(({ content, onChange }: { content: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void }) => {
    return (
        <Textarea
            value={content}
            onChange={onChange}
            placeholder="Edit your note here..."
            className="w-full h-full text-lg p-4 rounded-md shadow-inner focus:ring-2 focus:ring-blue-300 transition-all duration-300 ease-in-out resize-none dark:bg-gray-700 dark:text-white"
            aria-label="Edit Note"
            autoFocus
        />
    );
});

export default function Component() {
    const [notes, setNotes] = useState<Note[]>([
        { title: "Untitled Note", content: "", diagrams: [] },
    ]);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [appSettings, setAppSettings] = useState({
        theme: "light",
        font: "sans-serif",
        language: "en",
    });
    const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
    const [quizSettings, setQuizSettings] = useState({
        topic: "",
        quizType: "Multiple Choice",
        audience: "",
        difficultyLevel: "Hard",
        numQuestions: 5,
        answerKey: "No",
        additionalNotes: "",
    });
    const [showDiagrams] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [currentPageTitle, setCurrentPageTitle] = useState("");
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [summarizeStatus, setSummarizeStatus] = useState("");
    const [isCycling, setIsCycling] = useState(false);
    const [editingTitle, setEditingTitle] = useState<number | null>(null);
    const [error, setError] = useState("");
    const [lastClickTime, setLastClickTime] = useState<number | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedText, setSelectedText] = useState("");
    const [mathSolution, setMathSolution] = useState<string[]>([]);
    const [isSolving, setIsSolving] = useState(false);

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const cycleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const newTabInputRef = useRef<HTMLInputElement>(null);

    const [pendingContent, setPendingContent] = useState("");
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const selectedTextRef = useRef("");

    const [isMathMode, setIsMathMode] = useState(false);
    const [mathInput, setMathInput] = useState("");
    const [mathError, setMathError] = useState("");
    const mathInputRef = useRef<HTMLTextAreaElement>(null);

    const [notesBoxKey, setNotesBoxKey] = useState(0);
    const [generatedOutput, setGeneratedOutput] = useState(null);
    const [isOverlayVisible, setOverlayVisible] = useState(false);

    const saveNotesToLocalStorage = (notes: Note[]) => {
        const serializedNotes = notes.map(note => ({
          ...note,
          id: crypto.randomUUID(), // Generate a unique ID for each note
          lastModified: new Date().toISOString()
        }));
        
        localStorage.setItem('notesifyNotes', JSON.stringify(serializedNotes));
    };


    // Handle keyboard shortcut for math mode
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "m") {
                event.preventDefault();
                setIsMathMode((prev) => !prev);
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    // Auto-focus math input when math mode is activated
    useEffect(() => {
        if (isMathMode && mathInputRef.current) {
            mathInputRef.current.focus();
        }
    }, [isMathMode]);

    // Function to call the Groq API
    const solveWithGroq = async (latex: any) => {
        try {
            const response = await fetch('/api/math', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ latex }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            return data.response; // Return the step-by-step solution
        } catch (error) {
            console.error("Error calling Groq API:", error);
            throw error;
        }
    };

    // Function to solve the selected equation
    const solveSelectedEquation = async () => {
        if (selectedText.trim() === "") {
            setError("No equation selected.");
            return;
        }

        setIsSolving(true);
        setError("");

        try {
            // Call the Groq API to solve the LaTeX equation
            const solution = await solveWithGroq(selectedText);

            // Split the solution into sentences
            const sentences: string[] = solution.split('. ').map((sentence: string) => sentence.trim() + '.');

            // Set the step-by-step solution as an array of sentences
            setMathSolution(sentences);
            console.log("Step-by-step solution:", sentences);
        } catch (error) {
            console.error("Error solving equation:", error);
            setError("Failed to solve the equation.");
        } finally {
            setIsSolving(false);
        }
    };

    // Summarize content with LaTeX protection
    const summarizeContent = useCallback(
        (content: string) => {
          const { protectedContent, latexBlocks } = protectLaTeX(content);
          setIsSummarizing(true);
          const titles = notes.map((note) => note.title);
          summarizeNote(
            notes[currentPage].content,
            protectedContent,
            currentPageTitle,
            titles,
            notes
          ).then((result) => {
            setIsSummarizing(false);
            setSummarizeStatus(result.message);
            if (result.success) {
              const restoredContent = restoreLaTeX(result.summary, latexBlocks);
              const uniqueContent = removeDuplicates(restoredContent);
              setNotes((oldNotes) => {
                const newNotes = [...oldNotes];
                const currentNote = newNotes[currentPage];
                const isDefaultTitle = currentNote.title.startsWith("Untitled Note");
                const isEmptyNote = currentNote.content.trim() === "";
                const newNote = {
                  title: result.currentContext,
                  content: uniqueContent,
                  diagrams: [],
                };
      
                if (isDefaultTitle && isEmptyNote) {
                  newNotes[currentPage] = newNote;
                } else {
                  const noteIndex = newNotes.findIndex(
                    (note) => note.title === newNote.title
                  );
      
                  if (noteIndex !== -1) {
                    newNotes[noteIndex] = newNote;
                    setCurrentPage(noteIndex);
                  } else if (!result.createNewContext) {
                    newNotes[currentPage] = newNote;
                  } else {
                    newNotes.push(newNote);
                    setCurrentPage(newNotes.length - 1);
                  }
                }
                
                // Save notes to local storage after updating
                saveNotesToLocalStorage(newNotes);
                
                return newNotes;
              });
              setCurrentPageTitle(result.currentContext);
              setPendingContent("");
            }
            setTimeout(() => setSummarizeStatus(""), 3000);
          });
        },
        [notes, currentPage, currentPageTitle]
      );

    useEffect(() => {
        const storedNotes = localStorage.getItem('notesifyNotes');
        if (storedNotes) {
          try {
            const parsedNotes = JSON.parse(storedNotes);
            if (parsedNotes.length > 0) {
              setNotes(parsedNotes);
              setCurrentPage(0);
            }
          } catch (error) {
            console.error('Error parsing stored notes:', error);
          }
        }
    }, []);  

    // Update the handleManualInput function
    const handleManualInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        setPendingContent(newContent);

        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        // Check if the input event is a paste event
        if (e.nativeEvent instanceof InputEvent && e.nativeEvent.inputType === 'insertFromPaste') {
            // Immediately summarize for paste events
            summarizeContent(newContent);
        } else {
            // Use debounce for regular typing
            timerRef.current = setTimeout(() => {
                summarizeContent(newContent);
            }, DEBOUNCE_DELAY);
        }
    };

    // Handle changes in the pending content for transcribed audio
    const handleTranscribedInput = (newContent: string) => {
        setPendingContent((prevContent) => prevContent + " " + newContent);

        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(() => {
            summarizeContent(pendingContent + " " + newContent);
        }, DEBOUNCE_DELAY);
    };

    // Remove duplicate lines from content
    const removeDuplicates = (content: string) => {
        const lines = content.split("\n");
        const uniqueLines = [...new Set(lines)];
        return uniqueLines.join("\n");
    };

    // Insert LaTeX equation into notes
    const insertMathEquation = () => {
        if (mathInput.trim()) {
            const equation = `$${mathInput}$`;
            setNotes((prevNotes) => {
                const newNotes = [...prevNotes];
                const currentNote = newNotes[currentPage];
                const newContent = removeDuplicates(currentNote.content + `\n${equation}\n`);
                newNotes[currentPage] = {
                    ...currentNote,
                    content: newContent,
                };
                return newNotes;
            });
            setMathInput("");
            setIsMathMode(false);
        }
    };

    const renderLaTeX = useCallback((text: string) => {
        try {
            const inlineRegex = /\$(.*?)\$/g;
            const blockRegex = /\$\$(.*?)\$\$/g;
            return text
                .split(blockRegex)
                .map((part, index) => {
                    if (index % 2 === 1) {
                        return (
                            <div
                                key={index}
                                dangerouslySetInnerHTML={{
                                    __html: katex.renderToString(part, {
                                        throwOnError: false,
                                        displayMode: true,
                                    }),
                                }}
                            />
                        );
                    }
                    return part
                        .split(inlineRegex)
                        .map((subPart, subIndex) => {
                            if (subIndex % 2 === 1) {
                                return (
                                    <span
                                        key={`${index}-${subIndex}`}
                                        dangerouslySetInnerHTML={{
                                            __html: katex.renderToString(subPart, {
                                                throwOnError: false,
                                            }),
                                        }}
                                    />
                                );
                            }
                            return subPart;
                        });
                });
        } catch (error) {
            setMathError("Invalid LaTeX input");
            return text;
        }
    }, []);

    const renderMarkdown = useMemo(() => {
        return (content: string) => {
            return (
                <ReactMarkdown
                    components={{
                        p: ({ node, ...props }) => {
                            const children = React.Children.toArray(props.children);
                            return (
                                <p {...props}>
                                    {children.map((child, index) =>
                                        typeof child === "string"
                                            ? renderLaTeX(child)
                                            : child
                                    )}
                                </p>
                            );
                        },
                    }}
                >
                    {content}
                </ReactMarkdown>
            );
        };
    }, [renderLaTeX]);

    const renderSolution = (solution: string[]) => {
        return solution.map((sentence, index) => (
            <div
                key={index}
                className="mb-2"
                dangerouslySetInnerHTML={{
                    __html: katex.renderToString(sentence, {
                        throwOnError: false,
                    }),
                }}
            />
        ));
    };

    // Export notes
    const exportNotes = async () => {
        setIsExporting(true);
        try {
            const response = await fetch("http://localhost:8000/upload", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(notes),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            console.log("Notes exported successfully");
        } catch (error) {
            console.error("Error exporting notes:", error);
        } finally {
            setIsExporting(false);
        }
    };

    // Open settings modal
    const openSettings = () => {
        setIsSettingsOpen(true);
    };

    // Close settings modal
    const closeSettings = () => {
        setIsSettingsOpen(false);
    };

    // Save settings
    const handleSaveSettings = (appSettings: { theme: string; font: string; language: string }) => {
        setAppSettings(appSettings);
        console.log("Settings saved:", appSettings);
    };


    // Open quiz modal
    const openQuizModal = () => {
        setIsQuizModalOpen(true);
    };

    // Close quiz modal
    const closeQuizModal = () => {
        setIsQuizModalOpen(false);
    };

    // Initialize the client
    const client = new GumloopClient({
        apiKey: "a04de40bc6b64797b52e24d213470f2e", // Replace with your API key
        userId: "hN5cnq9HEnaSxYyFwCrS9h8fRvN2",  // Replace with your user ID
    });

    // Run a flow and wait for outputs
    async function runFlow(settings: typeof quizSettings) {
        try {
            // Prepare the input parameters for the flow
            const inputs = {
                topic: settings.topic,
                quizType: settings.quizType,
                audience: settings.audience,
                difficultyLevel: settings.difficultyLevel,
                numQuestions: settings.numQuestions.toString(),
                answerKey: settings.answerKey,
                additionalNotes: settings.additionalNotes,
            };

            // Execute the flow
            const output = await client.runFlow("9y5oSctDArBsbQmK1UCXii", inputs); // Replace with your actual flow ID

            // Handle the response
            console.log("Flow Output:", output); // Log the output for debugging
            setGeneratedOutput(output['Quiz Link'] || "No output generated.");
            setOverlayVisible(true); // Show the overlay with the output

            // Optionally, close the modal after successful submission
            closeQuizModal();
        } catch (error) {
            console.error("Flow execution failed:", error);
            alert("Failed to create quiz.");
        }
    }
    // Handle math input changes
    const handleMathInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setMathInput(e.target.value);
    };

    useEffect(() => {
        if (isCycling) {
            startRecordingCycle();
        } else {
            stopRecordingCycle();
        }
    }, [isCycling]);

    // Start recording audio
    const startRecording = async () => {
        try {
            if (!streamRef.current) {
                streamRef.current = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                });
            }
            const mediaRecorder = new MediaRecorder(streamRef.current);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, {
                    type: "audio/webm",
                });
                try {
                    const result = await transcribeAudioChunk(audioBlob, pendingContent);
                    handleTranscribedInput(result.text);
                } catch (error) {
                    console.error("Transcription error:", error);
                }
            };

            mediaRecorder.start();
        } catch (error) {
            console.error("Error accessing microphone:", error);
        }
    };

    // Add a new page
    const addNewPage = () => {
        const newNotes = [
            ...notes,
            { title: `Untitled Note ${notes.length + 1}`, content: "", diagrams: [] },
        ];
        setNotes(newNotes);
        setCurrentPage(newNotes.length - 1);
        setEditingTitle(newNotes.length - 1);
        setTimeout(() => {
            if (newTabInputRef.current) {
                newTabInputRef.current.focus();
            }
        }, 0);
    };

    // Remove a page
    const removePage = (indexToRemove: number, event: React.MouseEvent) => {
        event.stopPropagation();
        if (notes.length > 1) {
            const updatedNotes = notes.filter((_, index) => index !== indexToRemove);
            setNotes(updatedNotes);
            
            // Update localStorage
            localStorage.setItem('notesifyNotes', JSON.stringify(updatedNotes));
            
            if (currentPage >= indexToRemove && currentPage > 0) {
                setCurrentPage(currentPage - 1);
            }
        }
    };

    // Update page title
    const updatePageTitle = (index: number) => {
        if (currentPageTitle.trim() !== "") {
            setNotes((prevNotes) => {
                const updatedNotes = [...prevNotes];
                updatedNotes[index] = { ...updatedNotes[index], title: currentPageTitle.trim() };
                return updatedNotes;
            });
        }
        setEditingTitle(null);
    };

    // Handle title click
    const handleTitleClick = (index: number) => {
        const currentTime = new Date().getTime();

        if (lastClickTime && currentTime - lastClickTime < 300) {
            setEditingTitle(index);
            setLastClickTime(null);
        } else {
            setCurrentPage(index);
            setLastClickTime(currentTime);
        }
    };

    // Handle title blur
    const handleTitleBlur = () => {
        setEditingTitle(null);
    };

    // Handle title key down
    const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter") {
            setEditingTitle(null);
        }
    };

    // Stop recording audio
    const stopRecording = () => {
        if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state !== "inactive"
        ) {
            mediaRecorderRef.current.stop();
        }
    };

    // Start recording cycle
    const startRecordingCycle = useCallback(() => {
        setIsCycling(true);
        const runCycle = () => {
            startRecording();
            cycleTimeoutRef.current = setTimeout(() => {
                stopRecording();
                if (isCycling) {
                    runCycle();
                }
            }, CYCLE_DURATION);
        };
        runCycle();
    }, [CYCLE_DURATION, isCycling]);

    // Stop recording cycle
    const stopRecordingCycle = useCallback(() => {
        setIsCycling(false);
        stopRecording();
        if (cycleTimeoutRef.current) {
            clearTimeout(cycleTimeoutRef.current);
        }
    }, []);

    // Toggle recording
    const toggleRecording = () => {
        setIsCycling((prev) => !prev);
    };

    // Toggle edit mode
    const toggleEditMode = () => {
        setEditMode(!editMode);
    };

    // Handle note edit
    const handleNoteEdit = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        setNotes(prevNotes => {
            const newNotes = [...prevNotes];
            newNotes[currentPage] = { ...newNotes[currentPage], content: newContent };
            return newNotes;
        });
    };


    // Function to handle blur event on the notes box
    const handleNotesBoxBlur = () => {
        // Increment the key to force a re-render
        setNotesBoxKey((prevKey) => prevKey + 1);
    };

    // Handle view click
    const handleViewClick = () => {
        setEditMode(true);
    };

    // Handle edit blur
    const handleEditBlur = () => {
        setEditMode(false);
    };


    const saveSelectedText = () => {
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) {
            const selected = selection.toString();
            setSelectedText(selected);
            console.log("Selected Text:", selected);
        }
    };


    const escapeRegExp = (string: string) => {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    // Highlight text
    const highlightText = (text: string, highlightedText: string) => {
        if (!highlightedText) return text;
        const escapedHighlightedText = escapeRegExp(highlightedText);
        const parts = text.split(new RegExp(`(${escapedHighlightedText})`, 'gi'));
        return parts.map((part, i) =>
            part.toLowerCase() === highlightedText.toLowerCase()
                ? <mark key={i}>{part}</mark>
                : part
        );
    };

    // Initialize mermaid
    useEffect(() => {
        mermaid.initialize({ startOnLoad: true });
    }, []);

    // Set current page
    const handleSetCurrentPage = (index: number) => {
        setCurrentPage(index);
        setMathInput("");
        setIsMathMode(false);
    };

    const toggleSidebar = () => {
        setIsSidebarOpen((prev) => !prev);
    };

    const closeOverlay = () => {
        setOverlayVisible(false);
    };

    return (
        <div className={`${appSettings.theme === "dark" ? "dark" : ""}`}>
            <div className="max-h-[calc(100vh-28px)] bg-gray-50 dark:bg-gray-900 flex flex-col w-full">
                <header className="bg-white dark:bg-gray-800 shadow-sm">
                    <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                        <h1 className="text-4xl font-[1000] text-gray-900 dark:text-white"><a href="/" className="nav-link">Notesify</a></h1>
                        <div className="flex items-center space-x-4">
                            <Button
                                onClick={toggleRecording}
                                className={isCycling ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"}
                            >
                                {isCycling ? <MicOff className="mr-2" /> : <Mic className="mr-2" />}
                                {isCycling ? "" : ""}
                            </Button>
                            <Button
                                onClick={() => setIsMathMode((prev) => !prev)}
                                className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
                            >
                                {isMathMode ? "Exit f(x)" : "f(x)"}
                            </Button>
                            <Button
                                onClick={saveSelectedText}
                                className="bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700"
                            >
                                Save Selected Text
                            </Button>
                            <Button
                                onClick={solveSelectedEquation}
                                disabled={isSolving || selectedText.trim() === ""}
                                className="bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700"
                            >
                                {isSolving ? (
                                    <Loader2 className="animate-spin h-5 w-5 text-white" />
                                ) : (
                                    "Solve Equation"
                                )}
                            </Button>
                            <div className="mt-4 p-2 border rounded bg-gray-100 dark:bg-gray-800">
                                <strong>Selected Text:</strong>
                                <p>{selectedText}</p>
                                {mathSolution.length > 0 && (
                                    <>
                                        <strong>Solution:</strong>
                                        {renderSolution(mathSolution)}
                                    </>
                                )}
                                {error && (
                                    <p className="text-red-500">{error}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </header>
                <main className="flex-grow flex p-4 w-full h-[calc(100vh-100px)]">
                    {/* Sidebar */}
                    <aside
                        className={`fixed left-0 top-0 h-full w-64 bg-gray-800 text-white flex-shrink-0 transition-all duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                            } ${appSettings.theme === "dark" ? "dark:bg-gray-800" : "bg-gray-800"}`}
                    >
                        <nav className="flex flex-col p-4 space-y-8">
                            <Button onClick={openSettings} className="bg-purple-500 hover:bg-purple-600">
                                Settings
                            </Button>
                            <Button onClick={() => handleSetCurrentPage(0)} className="bg-blue-500 hover:bg-blue-600">
                                Notes
                            </Button>
                            <Button onClick={openQuizModal} className="bg-green-500 hover:bg-green-600">
                                Create Quiz
                            </Button>
                            <Button onClick={() => alert('Flashcard section clicked')} className="bg-yellow-500 hover:bg-yellow-600">
                                Flashcard
                            </Button>
                        </nav>
                    </aside>

                    {/* Notes Section */}
                    <div
                        className={`flex-grow transition-all duration-300 ease-in-out ${isSidebarOpen ? "ml-64" : "ml-0"
                            }`}
                    >
                        <Button
                            onClick={toggleSidebar}
                            className="bg-gray-500 hover:bg-gray-600 absolute top-4 left-4 z-10 p-2"
                        >
                            <Menu className="h-6 w-6" />
                        </Button>
                        <div className="flex items-center space-x-2 overflow-x-auto mb-4 pr-32 relative">
                            {notes.map((note, index) => (
                                <div key={index} className="flex-shrink-0 relative group">
                                    {editingTitle === index ? (
                                        <Input
                                            ref={index === notes.length - 1 ? newTabInputRef : null}
                                            value={currentPageTitle}
                                            onChange={(e) => setCurrentPageTitle(e.target.value)}
                                            onBlur={() => updatePageTitle(index)}
                                            onKeyPress={(e) => {
                                                if (e.key === "Enter") {
                                                    updatePageTitle(index);
                                                }
                                            }}
                                            className="w-32 text-sm dark:bg-gray-700 dark:text-white"
                                        />
                                    ) : (
                                        <Button
                                            onClick={() => handleSetCurrentPage(index)}
                                            onDoubleClick={() => {
                                                setEditingTitle(index);
                                                setCurrentPageTitle(note.title);
                                            }}
                                            className={`
                                                ${currentPage === index
                                                    ? "bg-blue-500 text-white hover:bg-blue-500"
                                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-white"
                                                } transition-colors duration-200 pr-8
                                            `}
                                        >
                                            {note.title}
                                        </Button>
                                    )}
                                    {notes.length > 1 && (
                                        <button
                                            onClick={(e) => removePage(index, e)}
                                            className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                        >
                                            <X className="h-4 w-4 text-gray-500 hover:text-red-500 dark:text-gray-300" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                onClick={addNewPage}
                                className="inline-flex justify-center items-center px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 size-10 dark:bg-gray-700 dark:text-white"
                                aria-label="Add new note"
                            >
                                <Plus className="size-6" />
                            </button>
                        </div>
                        <div className="flex-grow flex flex-col h-[calc(100%-4rem)]">
                            <div className="h-3/4 mb-4">
                                {editMode ? (
                                    <NoteEditor
                                        content={notes[currentPage]?.content || ""}
                                        onChange={handleNoteEdit}
                                    />
                                ) : (
                                    <div
                                        key={notesBoxKey} // Force re-render when key changes
                                        onClick={handleViewClick}
                                        onBlur={handleNotesBoxBlur} // Handle blur event
                                        className="w-full h-full bg-white border-2 text-lg p-4 rounded-md shadow-inner focus:ring-2 focus:ring-blue-300 transition-all duration-300 ease-in-out overflow-y-auto cursor-text dark:bg-gray-700 dark:text-white"
                                    >
                                        {renderMarkdown(notes[currentPage]?.content || "Click to edit...")}
                                    </div>
                                )}
                            </div>
                            {isMathMode && (
                                <div className="mt-4">
                                    <Textarea
                                        ref={mathInputRef}
                                        value={mathInput}
                                        onChange={handleMathInput}
                                        placeholder="Type your LaTeX equation here..."
                                        className="w-full h-20 text-lg p-2 rounded-lg shadow-inner bg-blue-100 focus:ring-2 focus:ring-blue-300 transition-all duration-300 ease-in-out resize-none dark:bg-gray-700 dark:text-white"
                                        aria-label="Math Equation Input"
                                    />
                                    <Button onClick={insertMathEquation} className="mt-2">
                                        Insert Equation
                                    </Button>
                                    <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded">
                                        <strong>Preview:</strong>
                                        <div
                                            dangerouslySetInnerHTML={{
                                                __html: katex.renderToString(mathInput, {
                                                    throwOnError: false,
                                                }),
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                            <div className="h-1/4 relative">
                                <Textarea
                                    value={pendingContent}
                                    onChange={handleManualInput}
                                    onPaste={(e) => {
                                        e.preventDefault();
                                        const pastedText = e.clipboardData.getData("text");
                                        const newContent = pendingContent + pastedText;
                                        setPendingContent(newContent);
                                        summarizeContent(newContent);
                                    }}
                                    placeholder="Type or record your notes here..."
                                    className="w-full h-full text-lg p-2 rounded-lg shadow-inner bg-blue-100 focus:ring-2 focus:ring-blue-300 transition-all duration-300 ease-in-out resize-none dark:bg-gray-700 dark:text-white"
                                    aria-label="Pending Note Input"
                                />
                                <div className="absolute bottom-4 right-4 flex items-center space-x-2">
                                    {isSummarizing && (
                                        <Loader2 className="animate-spin h-5 w-5 text-gray-400 dark:text-gray-300" />
                                    )}
                                    {summarizeStatus && (
                                        <span className="text-sm text-green-600 dark:text-green-400">
                                            {summarizeStatus}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="mt-4 p-2 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded">
                                {error}
                            </div>
                        )}
                    </div>
                </main>
                {isSettingsOpen && (
                    <SettingsModal
                        isOpen={isSettingsOpen}
                        onClose={closeSettings}
                        onSave={handleSaveSettings}
                    />
                )}
                {isQuizModalOpen && (
                    <QuizModal
                        isOpen={isQuizModalOpen}
                        onClose={() => setIsQuizModalOpen(false)}
                        onRun={runFlow}
                    />
                )}
                {isOverlayVisible && <OutputOverlay output={generatedOutput} onClose={closeOverlay} />}
            </div>
        </div>
    )
};