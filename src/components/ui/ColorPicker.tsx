import React from "react";

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
}

export function ColorPicker({
  value,
  onChange,
  label,
  placeholder,
}: ColorPickerProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-900 mb-2">
        {label}
      </label>
      <div className="flex items-center space-x-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white font-mono text-sm"
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}
