import React from 'react';
import { X } from 'lucide-react';
import DiagramGenerator from './diagram-generator';

interface DiagramModalProps {
  mermaidCode: string;
  onClose: () => void;
}

const DiagramModal: React.FC<DiagramModalProps> = ({ mermaidCode, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-11/12 h-5/6 max-w-7xl max-h-[90vh] flex flex-col">
        <div className="flex justify-end mb-2">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        <div className="flex-grow flex items-center justify-center overflow-auto">
          <DiagramGenerator mermaidCode={mermaidCode}/>
        </div>
      </div>
    </div>
  );
};

export default DiagramModal;
