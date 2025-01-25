// components/SettingsModal.tsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: { theme: string; font: string; language: string }) => void;
}

export default function SettingsModal({ isOpen, onClose, onSave }: SettingsModalProps) {
  const [theme, setTheme] = useState("light");
  const [font, setFont] = useState("sans-serif");
  const [language, setLanguage] = useState("en");

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({ theme, font, language });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-xl font-bold mb-4">Settings</h2>
        <div className="space-y-4">
          {/* Theme Select */}
          <div>
            <label className="block text-sm font-medium mb-1">Theme</label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          {/* Font Select */}
          <div>
            <label className="block text-sm font-medium mb-1">Font</label>
            <select
              value={font}
              onChange={(e) => setFont(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="sans-serif">Sans Serif</option>
              <option value="serif">Serif</option>
              <option value="monospace">Monospace</option>
            </select>
          </div>

          {/* Language Select */}
          <div>
            <label className="block text-sm font-medium mb-1">Default Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-2">
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </div>
    </div>
  );
}