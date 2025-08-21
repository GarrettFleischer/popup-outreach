export interface Theme {
  name: string;
  colors: {
    from: string;
    through: string;
    to: string;
  };
}

export const predefinedThemes: Theme[] = [
  {
    name: "Sunset Orange",
    colors: { from: "#f97316", through: "#ea580c", to: "#dc2626" },
  },
  {
    name: "Ocean Blue",
    colors: { from: "#0ea5e9", through: "#0284c7", to: "#0369a1" },
  },
  {
    name: "Royal Purple",
    colors: { from: "#8b5cf6", through: "#7c3aed", to: "#6d28d9" },
  },
  {
    name: "Emerald Green",
    colors: { from: "#10b981", through: "#059669", to: "#047857" },
  },
  {
    name: "Rose Pink",
    colors: { from: "#f43f5e", through: "#e11d48", to: "#be123c" },
  },
  {
    name: "Indigo Night",
    colors: { from: "#6366f1", through: "#4f46e5", to: "#4338ca" },
  },
  {
    name: "Teal Ocean",
    colors: { from: "#14b8a6", through: "#0d9488", to: "#0f766e" },
  },
  {
    name: "Amber Sunset",
    colors: { from: "#f59e0b", through: "#d97706", to: "#b45309" },
  },
  {
    name: "Slate Gray",
    colors: { from: "#64748b", through: "#475569", to: "#334155" },
  },
  {
    name: "Lime Fresh",
    colors: { from: "#84cc16", through: "#65a30d", to: "#4d7c0f" },
  },
  {
    name: "Cyan Sky",
    colors: { from: "#06b6d4", through: "#0891b2", to: "#0e7490" },
  },
  {
    name: "Violet Dream",
    colors: { from: "#a855f7", through: "#9333ea", to: "#7c3aed" },
  },
  {
    name: "Blue to Purple",
    colors: { from: "#3b82f6", through: "#8b5cf6", to: "#a855f7" },
  },
  {
    name: "Ocean to Indigo",
    colors: { from: "#0ea5e9", through: "#6366f1", to: "#8b5cf6" },
  },
  {
    name: "Sunset to Pink",
    colors: { from: "#f97316", through: "#ec4899", to: "#be185d" },
  },
  {
    name: "Green to Blue",
    colors: { from: "#10b981", through: "#06b6d4", to: "#3b82f6" },
  },
  {
    name: "Purple to Pink",
    colors: { from: "#8b5cf6", through: "#ec4899", to: "#f43f5e" },
  },
  {
    name: "Blue to Teal",
    colors: { from: "#3b82f6", through: "#0ea5e9", to: "#14b8a6" },
  },
  {
    name: "Orange to Red",
    colors: { from: "#f97316", through: "#ef4444", to: "#dc2626" },
  },
  {
    name: "Indigo to Purple",
    colors: { from: "#6366f1", through: "#8b5cf6", to: "#a855f7" },
  },
  {
    name: "Custom",
    colors: { from: "", through: "", to: "" },
  },
];
