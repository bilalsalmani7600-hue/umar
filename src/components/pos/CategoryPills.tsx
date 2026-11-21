import React from 'react';
import { cn } from '@/lib/utils';

interface CategoryPillsProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
}

export const CategoryPills: React.FC<CategoryPillsProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] select-none">
      <button
        type="button"
        onClick={() => onSelectCategory('All')}
        className={cn(
          'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all shadow-sm active:scale-95',
          selectedCategory === 'All'
            ? 'bg-brand text-white'
            : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted'
        )}
      >
        All Toys
      </button>

      {categories.map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => onSelectCategory(cat)}
          className={cn(
            'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all shadow-sm active:scale-95',
            selectedCategory === cat
              ? 'bg-brand text-white'
              : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          {cat}
        </button>
      ))}
    </div>
  );
};

