import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRun: (settings: {
    topic: string;
    quizType: string;
    audience: string;
    difficultyLevel: string;
    numQuestions: number;
    answerKey: string;
    additionalNotes: string;
  }) => Promise<void>;
}

export default function QuizModal({
  isOpen,
  onClose,
  onRun,
}: QuizModalProps) {
  const [topic, setTopic] = useState("");
  const [quizType, setQuizType] = useState("Multiple Choice");
  const [audience, setAudience] = useState("");
  const [difficultyLevel, setDifficultyLevel] = useState("Hard");
  const [numQuestions, setNumQuestions] = useState(5);
  const [answerKey, setAnswerKey] = useState("No");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleRun = async () => {
    const settings = {
      topic,
      quizType,
      audience,
      difficultyLevel,
      numQuestions,
      answerKey,
      additionalNotes,
    };

    // Start loading
    setIsLoading(true);

    try {
      // Wait for quiz generation to complete
      await onRun(settings);
    } catch (error) {
      console.error("Quiz generation failed", error);
    } finally {
      // Stop loading regardless of success or failure
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className={`fixed inset-0 bg-black ${isLoading ? 'bg-opacity-50 blur-sm' : 'bg-opacity-0'} flex justify-center items-center transition-all duration-300`}>
        <div className={`bg-white p-6 rounded-lg shadow-lg w-96 ${isLoading ? 'opacity-30' : 'opacity-100'} transition-all duration-300`}>
          <h2 className="text-xl font-bold mb-4">Create Quiz</h2>
          <div className="space-y-4">
            {/* Topic */}
            <div>
              <label className="block text-sm font-medium mb-1">Quiz Topic</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Enter quiz topic"
                required
              />
            </div>

            {/* Quiz Type */}
            <div>
              <label className="block text-sm font-medium mb-1">Quiz Type</label>
              <select
                value={quizType}
                onChange={(e) => setQuizType(e.target.value)}
                className="w-full p-2 border rounded"
                required
              >
                <option value="Multiple Choice">Multiple Choice</option>
                <option value="True/False">True/False</option>
              </select>
            </div>

            {/* Audience */}
            <div>
              <label className="block text-sm font-medium mb-1">Audience</label>
              <input
                type="text"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Enter audience"
                required
              />
            </div>

            {/* Difficulty Level */}
            <div>
              <label className="block text-sm font-medium mb-1">Difficulty Level</label>
              <select
                value={difficultyLevel}
                onChange={(e) => setDifficultyLevel(e.target.value)}
                className="w-full p-2 border rounded"
                required
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            {/* Number of Questions */}
            <div>
              <label className="block text-sm font-medium mb-1">Number of Questions</label>
              <input
                type="number"
                value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
                className="w-full p-2 border rounded"
                required
              />
            </div>

            {/* Answer Key */}
            <div>
              <label className="block text-sm font-medium mb-1">Provide Answer Key?</label>
              <select
                value={answerKey}
                onChange={(e) => setAnswerKey(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium mb-1">Additional Notes</label>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Enter any additional notes or instructions"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-2">
            <Button onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleRun} disabled={isLoading}>
              Run
            </Button>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 flex justify-center items-center z-50">
          <Loader2 className="animate-spin text-blue-500" size={64} />
        </div>
      )}
    </>
  );
}