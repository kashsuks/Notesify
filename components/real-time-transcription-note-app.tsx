"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
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
    // Replace LaTeX blocks with placeholders
    const latexBlocks: string[] = [];
    const protectedContent = content.replace(/\$\$.*?\$\$|\$.*?\$/g, (match) => {
        latexBlocks.push(match);
        return `@@LaTeX${latexBlocks.length - 1}@@`;
    });
    return { protectedContent, latexBlocks };
};

const restoreLaTeX = (content: string, latexBlocks: string[]) => {
    // Restore LaTeX blocks from placeholders
    return content.replace(/@@LaTeX(\d+)@@/g, (_, index) => latexBlocks[Number(index)]);
};

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

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const cycleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const newTabInputRef = useRef<HTMLInputElement>(null);

    const [pendingContent, setPendingContent] = useState("");
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const selectedTextRef = useRef("");

    const [isMathMode, setIsMathMode] = useState(false); // Added for math mode
    const [mathInput, setMathInput] = useState(""); // Added for LaTeX input
    const [mathError, setMathError] = useState(""); // Added for LaTeX errors
    const mathInputRef = useRef<HTMLTextAreaElement>(null); // Added for auto-focus

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

    // Render LaTeX in Markdown
    const renderLaTeX = (text: string) => {
        try {
            const inlineRegex = /\$(.*?)\$/g; // Inline math: $...$
            const blockRegex = /\$\$(.*?)\$\$/g; // Block math: $$...$$
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
                                        displayMode: true, // Render as block math
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
    };

    // Render Markdown with LaTeX support
    const renderMarkdown = (content: string) => {
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
      
          // console.log("Notes exported successfully");
        } catch (error) {
          console.error("Error exporting notes:", error);
        } finally {
          setIsExporting(false);
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

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        return () => {
            // Cleanup function
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
            }
        };
    }, []);

    const openSettings = () => {
        setIsSettingsOpen(true);
    };

    const closeSettings = () => {
        setIsSettingsOpen(false);
    };

    const handleSaveSettings = (settings: { theme: string; font: string; language: string }) => {
        setAppSettings(settings);
        console.log("Settings saved:", settings);
    };

    const handleMathInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setMathInput(e.target.value);
    };

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

    const removePage = (indexToRemove: number, event: React.MouseEvent) => {
        event.stopPropagation();
        if (notes.length > 1) {
            setNotes((prevNotes) => prevNotes.filter((_, index) => index !== indexToRemove));
            if (currentPage >= indexToRemove && currentPage > 0) {
                setCurrentPage(currentPage - 1);
            }
        }
    };

    const protectLaTeX = (content: string) => {
        // Replace LaTeX blocks with placeholders
        const latexBlocks: string[] = [];
        const protectedContent = content.replace(/\$\$.*?\$\$|\$.*?\$/g, (match) => {
            latexBlocks.push(match);
            return `@@LaTeX${latexBlocks.length - 1}@@`;
        });
        return { protectedContent, latexBlocks };
    };

    const restoreLaTeX = (content: string, latexBlocks: string[]) => {
        // Restore LaTeX blocks from placeholders
        return content.replace(/@@LaTeX(\d+)@@/g, (_, index) => latexBlocks[Number(index)]);
    };

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

    const handleTitleClick = (index: number) => {
        const currentTime = new Date().getTime();

        if (lastClickTime && currentTime - lastClickTime < 300) {
            // Double click detected
            setEditingTitle(index);
            setLastClickTime(null); // Reset last click time
        } else {
            // Single click
            setCurrentPage(index);
            setLastClickTime(currentTime);
        }
    };

    const handleTitleBlur = () => {
        setEditingTitle(null);
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter") {
            setEditingTitle(null);
        }
    };

    const stopRecording = () => {
        if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state !== "inactive"
        ) {
            mediaRecorderRef.current.stop();
        }
    };

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

    const stopRecordingCycle = useCallback(() => {
        setIsCycling(false);
        stopRecording();
        if (cycleTimeoutRef.current) {
            clearTimeout(cycleTimeoutRef.current);
        }
    }, []);

    useEffect(() => {
        if (isCycling) {
            startRecordingCycle();
        } else {
            stopRecordingCycle();
        }
    }, [isCycling, startRecordingCycle, stopRecordingCycle]);

    const toggleRecording = () => {
        setIsCycling((prev) => !prev);
    };

    const toggleEditMode = () => {
        setEditMode(!editMode);
    };

    const handleNoteEdit = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        setNotes(prevNotes => {
            const newNotes = [...prevNotes];
            newNotes[currentPage] = { ...newNotes[currentPage], content: newContent };
            return newNotes;
        });
    };

    const handleViewClick = () => {
        setEditMode(true);
    };

    const handleEditBlur = () => {
        setEditMode(false);
    };

    const handleTextSelection = useCallback(() => {
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) {
        }
    }, []);

    useEffect(() => {
        document.addEventListener("mouseup", handleTextSelection);
        return () => {
            document.removeEventListener("mouseup", handleTextSelection);
        };
    }, [handleTextSelection]);

    const escapeRegExp = (string: string) => {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
    };

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

    useEffect(() => {
        mermaid.initialize({ startOnLoad: true });
    }, []);

    // Update the setCurrentPage function to reset currentDiagram
    const handleSetCurrentPage = (index: number) => {
        setCurrentPage(index);
        setMathInput(""); // Clear math input
        setIsMathMode(false); // Exit math mode
    };

    return (
        <div className={`${appSettings.theme === "dark" ? "dark" : ""}`}>
            <div className="max-h-[calc(100vh-28px)] bg-gray-50 dark:bg-gray-900 flex flex-col w-full">
                <header className="bg-white dark:bg-gray-800 shadow-sm">
                    <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                        <h1 className="text-4xl font-[1000] text-gray-900 dark:text-white">Notesify</h1>
                        <div className="flex items-center space-x-4">
                            <Button
                                onClick={toggleRecording}
                                className={isCycling ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"}
                            >
                                {isCycling ? <MicOff className="mr-2" /> : <Mic className="mr-2" />}
                                {isCycling ? "Stop Recording" : "Start Recording"}
                            </Button>
                            <Button onClick={exportNotes} className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700">
                                {isExporting ? (
                                    <Loader2 className="animate-spin h-5 w-5 text-white" />
                                ) : (
                                    "Export Notes"
                                )}
                            </Button>
                            <Button onClick={openSettings} className="bg-purple-500 hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-700">
                                <Settings className="mr-2" />
                                Settings
                            </Button>
                            <Button
                                onClick={() => setIsMathMode((prev) => !prev)}
                                className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
                            >
                                {isMathMode ? "Exit Math Mode" : "Enter Math Mode"}
                            </Button>
                        </div>
                    </div>
                </header>
                <main className="flex-grow flex p-4 w-full h-[calc(100vh-100px)]">
                    <div className="w-full h-full flex flex-col">
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
                                    <Textarea
                                        value={notes[currentPage]?.content || ""}
                                        onChange={handleNoteEdit}
                                        onBlur={handleEditBlur}
                                        placeholder="Edit your note here..."
                                        className="w-full h-full text-lg p-4 rounded-md shadow-inner focus:ring-2 focus:ring-blue-300 transition-all duration-300 ease-in-out resize-none dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                        aria-label="Edit Note"
                                        autoFocus
                                    />
                                ) : (
                                    <div
                                        onClick={handleViewClick}
                                        className="w-full h-full bg-white border-2 text-lg p-4 rounded-md shadow-inner focus:ring-2 focus:ring-blue-300 transition-all duration-300 ease-in-out overflow-y-auto cursor-text dark:bg-gray-700 dark:text-white"
                                    >
                                        {renderMarkdown(notes[currentPage]?.content || "Click to edit...")}
                                    </div>
                                )}
                            </div>
                            {/* Math mode UI */}
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
            </div>
        </div>
    );
}