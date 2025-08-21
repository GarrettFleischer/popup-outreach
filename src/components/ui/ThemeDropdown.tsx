"use client";

import { Theme } from "@/utils/supabase/types";
import { GenericDropdown } from "./GenericDropdown";

// Specific ThemeDropdown component that uses GenericDropdown
interface ThemeDropdownProps {
  themes: Theme[];
  selectedTheme: Theme | null;
  onThemeChange: (theme: Theme) => void;
  placeholder?: string;
  className?: string;
}

export function ThemeDropdown({
  themes,
  selectedTheme,
  onThemeChange,
  placeholder = "Select Theme",
  className = "",
}: ThemeDropdownProps) {
  // Convert themes to dropdown options
  const themeOptions = themes.map((theme) => ({
    id: theme.name,
    label: theme.name,
    data: theme,
  }));

  // Find the selected option
  const selectedOption = selectedTheme
    ? themeOptions.find((opt) => opt.data.name === selectedTheme.name) || null
    : null;

  // Render function for theme options
  const renderThemeOption = (option: {
    id: string | number;
    label: string;
    data: Theme;
  }) => (
    <div className="flex items-center gap-3">
      <div
        className="w-8 h-6 rounded border border-gray-300 flex-shrink-0"
        style={{
          background:
            option.data.name === "Custom"
              ? "linear-gradient(to bottom, #e5e7eb, #d1d5db, #9ca3af)"
              : `linear-gradient(to bottom, ${option.data.colors.from}, ${option.data.colors.through}, ${option.data.colors.to})`,
        }}
      />
      <span className="flex-1">{option.data.name}</span>
    </div>
  );

  // Render function for selected theme
  const renderSelectedTheme = (
    option: { id: string | number; label: string; data: Theme } | null
  ) => {
    if (!option) return "Custom";
    return option.data.name;
  };

  return (
    <GenericDropdown
      options={themeOptions}
      selectedOption={selectedOption}
      onOptionChange={(option) => onThemeChange(option.data)}
      placeholder={placeholder}
      className={className}
      renderOption={renderThemeOption}
      renderSelected={renderSelectedTheme}
    />
  );
}
