import React from "react";

interface PageSizeSelectorProps {
  pageSize: number;
  onPageSizeChange: (newPageSize: number) => void;
  isLoading?: boolean;
  options?: number[];
}

export function PageSizeSelector({
  pageSize,
  onPageSizeChange,
  isLoading = false,
  options = [10, 20, 50, 100],
}: PageSizeSelectorProps) {
  return (
    <div className="flex items-center space-x-2">
      <label className="text-sm text-gray-900">Show:</label>
      <select
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        disabled={isLoading}
        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span className="text-sm text-gray-900">per page</span>
    </div>
  );
}
