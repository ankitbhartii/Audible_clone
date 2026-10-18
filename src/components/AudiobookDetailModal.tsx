import React, { useState } from 'react';
import { X, Play, Pause, BookmarkPlus, Check, Star, Clock, Calendar, ShieldCheck, ListMusic, MessageSquare } from 'lucide-react';
import { Audiobook } from '../api/types';
import { usePlayer, formatTime } from '../context/PlayerContext';
import { audibleService } from '../api/audibleService';

interface AudiobookDetailModalProps {
  book: Audiobook | null;
  onClose: () => void;
}

export const AudiobookDetailModal: React.FC<AudiobookDetailModalProps> = ({ book, onClose }) => {
  const { currentBook, currentChapterIndex, isPlaying, playBook, togglePlayPause, selectChapter } = usePlayer();
  const [activeTab, setActiveTab] = useState<'details' | 'chapters' | 'reviews'>('details');
  const [isInLibrary, setIsInLibrary] = useState(false);

  React.useEffect(() => {
    if (book) {
      const lib = audibleService.getUserLibrary();
      setIsInLibrary(lib.some((item) => item.asin === book.asin));
    }
  }, [book]);

  if (!book) return null;

  const isCurrentBook = currentBook?.asin === book.asin;
  const isThisPlaying = isCurrentBook && isPlaying;

  const handlePlayToggle = () => {
    if (isCurrentBook) {
      togglePlayPause();
    } else {
      playBook(book);
    }
  };

  const handleChapterClick = (index: number) => {
    if (isCurrentBook) {
      selectChapter(index);
    } else {
      playBook(book, index);
    }
  };

  const handleLibraryToggle = () => {
    if (isInLibrary) {
      audibleService.removeFromLibrary(book.asin);
      setIsInLibrary(false);
    } else {
      audibleService.addToLibrary(book.asin);
      setIsInLibrary(true);
    }
  };

  const coverUrl = (book.product_images['500'] || Object.values(book.product_images)[0] || '') as string;
  const avgRating = book.rating.overall_distribution.average_rating.toFixed(1);
  const totalRatings = book.rating.overall_distribution.total_ratings;
  const perfRating = book.rating.performance_distribution?.average_rating?.toFixed(1) || avgRating;
  const storyRating = book.rating.story_distribution?.average_rating?.toFixed(1) || avgRating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-[#141b26] border border-gray-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-gray-800/80 hover:bg-gray-750 text-gray-400 hover:text-white flex items-center justify-center transition-colors border border-gray-700/50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Hero Area */}
        <div className="p-6 sm:p-8 bg-gradient-to-b from-[#1b2434] to-[#141b26] border-b border-gray-800/80 flex flex-col sm:flex-row gap-6 sm:gap-8 items-center sm:items-start">
          {/* Cover Art */}
          <div className="relative shrink-0 w-40 sm:w-48 aspect-square rounded-2xl overflow-hidden shadow-2xl border border-gray-700/70 group">
            <img
              src={coverUrl}
              alt={book.title}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = 'https://m.media-amazon.com/images/I/41wuB-s8vRL._SL500_.jpg';
              }}
              className="w-full h-full object-cover"
            />
            <button
              onClick={handlePlayToggle}
              className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/50 transition-colors"
            >
              <div className="w-14 h-14 rounded-full bg-audible-orange text-gray-950 flex items-center justify-center shadow-lg shadow-orange-500/30 hover:scale-105 active:scale-95 transition-transform">
                {isThisPlaying ? (
                  <Pause className="w-7 h-7 fill-current" />
                ) : (
                  <Play className="w-7 h-7 fill-current ml-0.5" />
                )}
              </div>
            </button>
          </div>

          {/* Metadata */}
          <div className="flex-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-audible-orange/15 border border-audible-orange/30 text-[11px] font-bold text-audible-orange uppercase tracking-wider mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Unabridged Audiobook</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-1">
              {book.title}
            </h2>

            {book.subtitle && (
              <p className="text-sm text-gray-300 font-medium mb-2">
                {book.subtitle}
              </p>
            )}

            <div className="text-xs sm:text-sm text-gray-400 space-y-1 mb-4">
              <p>By <span className="text-gray-200 font-semibold">{book.authors.map(a => a.name).join(', ')}</span></p>
              <p>Narrated by <span className="text-gray-200 font-semibold">{book.narrators.map(n => n.name).join(', ')}</span></p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1">
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  <Star className="w-4 h-4 fill-current" />
                  {avgRating}
                  <span className="text-gray-400 font-normal">({totalRatings.toLocaleString()} ratings)</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  {Math.floor(book.runtime_length_min / 60)}h {book.runtime_length_min % 60}m
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  {new Date(book.release_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <button
                onClick={handlePlayToggle}
                className="px-5 py-2.5 rounded-full bg-audible-orange text-gray-950 font-bold text-sm flex items-center gap-2 hover:bg-amber-400 hover:scale-105 active:scale-95 transition-all shadow-md shadow-orange-500/20"
              >
                {isThisPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pause Audiobook</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                    <span>{isCurrentBook ? 'Resume Playing' : 'Play Full Audiobook'}</span>
                  </>
                )}
              </button>

              <button
                onClick={handleLibraryToggle}
                className={`px-4 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2 border transition-all ${
                  isInLibrary
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-gray-800/80 border-gray-700 text-gray-200 hover:bg-gray-700'
                }`}
              >
                {isInLibrary ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>In Library</span>
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="w-4 h-4 text-gray-400" />
                    <span>Add to Library</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Tab Headers */}
        <div className="flex items-center gap-4 px-6 sm:px-8 border-b border-gray-800 bg-[#121822]">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-audible-orange text-audible-orange'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Publisher Summary
          </button>
          <button
            onClick={() => setActiveTab('chapters')}
            className={`py-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'chapters'
                ? 'border-audible-orange text-audible-orange'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <ListMusic className="w-4 h-4" />
            <span>Chapters ({book.chapters?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`py-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'reviews'
                ? 'border-audible-orange text-audible-orange'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Customer Reviews</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {activeTab === 'details' && (
            <div className="space-y-6 text-gray-300 leading-relaxed text-sm">
              <div>
                <h4 className="text-white font-bold text-base mb-2">About this Audiobook</h4>
                <p className="whitespace-pre-line text-gray-300">{book.publisher_summary.replace(/<[^>]+>/g, '')}</p>
              </div>

              {book.category_name && (
                <div>
                  <h4 className="text-white font-bold text-xs uppercase tracking-wider text-gray-400 mb-2">Category</h4>
                  <span className="px-3 py-1 rounded-full bg-gray-800/80 border border-gray-700/60 text-xs text-gray-300">
                    {book.category_name}
                  </span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'chapters' && (
            <div className="space-y-2">
              <div className="text-xs text-gray-400 mb-2">Click any chapter to jump directly to that timestamp in the web player.</div>
              {book.chapters?.map((chap, idx) => {
                const isChapterActive = isCurrentBook && currentChapterIndex === idx;
                return (
                  <button
                    key={chap.id || idx}
                    onClick={() => handleChapterClick(idx)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl text-left border transition-all ${
                      isChapterActive
                        ? 'bg-audible-orange/15 border-audible-orange/40 text-audible-orange'
                        : 'bg-gray-800/40 border-gray-800/60 hover:bg-gray-800 hover:border-gray-700 text-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        isChapterActive ? 'bg-audible-orange text-black' : 'bg-gray-700 text-gray-300'
                      }`}>
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{chap.title}</div>
                        <div className="text-[11px] text-gray-400">
                          Starts at {formatTime(chap.start_offset_ms / 1000)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{formatTime(chap.length_ms / 1000)}</span>
                      {isChapterActive && isPlaying ? (
                        <Pause className="w-4 h-4 fill-current text-audible-orange" />
                      ) : (
                        <Play className="w-4 h-4 fill-current text-gray-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gray-800/40 border border-gray-700/60 flex items-center justify-around text-center">
                <div>
                  <div className="text-3xl font-black text-amber-400">
                    {avgRating}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Overall Rating</div>
                </div>
                <div className="h-10 w-px bg-gray-700" />
                <div>
                  <div className="text-3xl font-black text-amber-400">
                    {perfRating}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Narration Performance</div>
                </div>
                <div className="h-10 w-px bg-gray-700" />
                <div>
                  <div className="text-3xl font-black text-amber-400">
                    {storyRating}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Story Rating</div>
                </div>
              </div>

              <div className="text-xs text-gray-400 italic text-center pt-4">
                Verified Audible Listener Reviews are synced with customer ratings.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
