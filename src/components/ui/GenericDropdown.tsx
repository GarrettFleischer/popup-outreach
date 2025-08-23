"use client";

import { useState } from "react";

interface DropdownOption<T> {
  id: string | number;
  label: string;
  data: T;
}

interface GenericDropdownProps<T> {
  options: DropdownOption<T>[];
  selectedOption: DropdownOption<T> | null;
  onOptionChange: (option: DropdownOption<T>) => void;
  placeholder?: string;
  className?: string;
  renderOption: (
    option: DropdownOption<T>,
    isSelected?: boolean
  ) => React.ReactNode;
  renderSelected?: (option: DropdownOption<T> | null) => React.ReactNode;
}

export function GenericDropdown<T>({
  options,
  selectedOption,
  onOptionChange,
  placeholder = "Select Option",
  className = "",
  renderOption,
  renderSelected,
}: GenericDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOptionSelect = (option: DropdownOption<T>) => {
    onOptionChange(option);
    setIsOpen(false);
  };

  const getCurrentLabel = () => {
    if (renderSelected) {
      return renderSelected(selectedOption);
    }
    return selectedOption ? selectedOption.label : placeholder;
  };

  const isOptionSelected = (option: DropdownOption<T>) => {
    return selectedOption?.id === option.id;
  };

  return (
    <div className={`relative ${className}`} style={{ position: "relative" }}>
      {/* Dropdown Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white text-left flex items-center justify-between"
      >
        <span>{getCurrentLabel()}</span>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Options */}
      {isOpen && (
        <div
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
          style={{ display: "block" }}
        >
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => handleOptionSelect(option)}
              className={`w-full px-3 py-2 text-left hover:bg-gray-50 block ${
                isOptionSelected(option)
                  ? "bg-indigo-50 text-indigo-900"
                  : "text-gray-900"
              }`}
              style={{ display: "block" }}
            >
              {renderOption(option, isOptionSelected(option))}
            </button>
          ))}
        </div>
      )}

      {/* Click outside to close dropdown */}
      {isOpen && (
        <div className="fixed inset-0 z-0" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}
