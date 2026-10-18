import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Audiobook } from '../api/types';
import { AudiobookCard } from './AudiobookCard';

interface AudiobookShelfProps {
  title: string;
  subtitle?: string;
  books: Audiobook[];
  onOpenDetails: (book: Audiobook) => void;
}

export const AudiobookShelf: React.FC<AudiobookShelfProps> = ({
  title,
  subtitle,
  books,
  onOpenDetails
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.75;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (!books || books.length === 0) return null;

  return (
    <section className="mb-10">
      {/* Shelf Header */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {/* Carousel Arrow Controls */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            aria-label="Scroll left"
            className="w-8 h-8 rounded-full bg-gray-800/80 hover:bg-gray-750 border border-gray-700/80 flex items-center justify-center text-gray-300 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            aria-label="Scroll right"
            className="w-8 h-8 rounded-full bg-gray-800/80 hover:bg-gray-750 border border-gray-700/80 flex items-center justify-center text-gray-300 hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 pt-1 scroll-smooth snap-x snap-mandatory no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {books.map((book) => (
          <div
            key={book.asin}
            className="shrink-0 w-44 sm:w-48 md:w-52 snap-start"
          >
            <AudiobookCard book={book} onOpenDetails={onOpenDetails} />
          </div>
        ))}
      </div>
    </section>
  );
};
