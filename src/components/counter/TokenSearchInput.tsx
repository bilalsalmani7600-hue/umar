import React from 'react';
import { Search, X } from 'lucide-react';

interface TokenSearchInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export const TokenSearchInput: React.FC<TokenSearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search Token (e.g. 54 or T054)...',
  inputRef,
}) => {
  return (
    <div className="relative w-full">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 pl-10 pr-9 rounded-xl border border-input bg-card text-sm font-semibold placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand transition-all"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

