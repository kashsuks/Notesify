// components/OutputOverlay.js

import React from 'react';

const OutputOverlay = ({ output, onClose }) => {
  if (!output) return null; // Don't render the overlay if there's no output

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96 max-h-96 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Generated Quiz Output</h2>
        {/* Displaying the output string */}
        <pre className="whitespace-pre-wrap break-words">{output}</pre>
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="bg-blue-500 text-white p-2 rounded">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default OutputOverlay;
