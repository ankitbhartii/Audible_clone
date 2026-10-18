import React from 'react';
import { Play, Pause, BookmarkPlus, Check, Star, Clock, Headphones } from 'lucide-react';
import { Audiobook } from '../api/types';
import { usePlayer } from '../context/PlayerContext';
import { audibleService } from '../api/audibleService';

interface HeroBannerProps {
  featuredBook: Audiobook;
  onOpenDetails: (book: Audiobook) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ featuredBook, onOpenDetails }) => {
  const { currentBook, isPlaying, playBook, togglePlayPause } = usePlayer();
  const [isInLibrary, setIsInLibrary] = React.useState(false);

  React.useEffect(() => {
    const lib = audibleService.getUserLibrary();
    setIsInLibrary(lib.some((item) => item.asin === featuredBook.asin));
  }, [featuredBook.asin]);

  const isThisBookPlaying = currentBook?.asin === featuredBook.asin && isPlaying;

  const handlePlayToggle = () => {
    if (currentBook?.asin === featuredBook.asin) {
      togglePlayPause();
    } else {
      playBook(featuredBook);
    }
  };

  const handleLibraryToggle = () => {
    if (isInLibrary) {
      audibleService.removeFromLibrary(featuredBook.asin);
      setIsInLibrary(false);
    } else {
      audibleService.addToLibrary(featuredBook.asin);
      setIsInLibrary(true);
    }
  };

  const coverUrl = (featuredBook.product_images['500'] || Object.values(featuredBook.product_images)[0] || '') as string;
  const avgRating = featuredBook.rating.overall_distribution.average_rating.toFixed(1);
  const totalRatings = featuredBook.rating.overall_distribution.total_ratings;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#121926] via-[#1a2333] to-[#121822] border border-gray-800/80 p-6 md:p-10 mb-10 shadow-2xl">
      {/* Background ambient blur */}
      <div
        className="absolute -right-20 -top-20 w-96 h-96 rounded-full bg-audible-orange/10 blur-3xl pointer-events-none"
      />
      <div
        className="absolute right-1/4 -bottom-20 w-80 h-80 rounded-full bg-amber-600/10 blur-3xl pointer-events-none"
      />

      <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
        {/* Audiobook Cover Art with Play Overlay */}
        <div className="relative group shrink-0 w-48 sm:w-56 md:w-64 aspect-square rounded-2xl overflow-hidden shadow-2xl shadow-black/80 border border-gray-700/60">
          <img
            src={coverUrl}
            alt={featuredBook.title}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = 'https://m.media-amazon.com/images/I/41wuB-s8vRL._SL500_.jpg';
            }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <button
            onClick={handlePlayToggle}
            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-xs"
          >
            <div className="w-16 h-16 rounded-full bg-audible-orange text-gray-950 flex items-center justify-center shadow-xl shadow-orange-500/30 hover:scale-110 transition-transform">
              {isThisBookPlaying ? (
                <Pause className="w-8 h-8 fill-current" />
              ) : (
                <Play className="w-8 h-8 fill-current ml-1" />
              )}
            </div>
          </button>
        </div>

        {/* Audiobook Information */}
        <div className="flex-1 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-audible-orange/15 border border-audible-orange/30 text-xs font-bold text-audible-orange uppercase tracking-wider mb-3">
            <Headphones className="w-3.5 h-3.5" />
            <span>Audible Editor's Pick</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight mb-2 leading-tight">
            {featuredBook.title}
          </h1>

          {featuredBook.subtitle && (
            <p className="text-base sm:text-lg text-gray-300 font-medium mb-3">
              {featuredBook.subtitle}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1 text-sm text-gray-400 mb-4">
            <span>By <strong className="text-gray-200">{featuredBook.authors.map(a => a.name).join(', ')}</strong></span>
            <span>•</span>
            <span>Narrated by <strong className="text-gray-200">{featuredBook.narrators.map(n => n.name).join(', ')}</strong></span>
            <span>•</span>
            <span className="flex items-center gap-1 text-amber-400 font-bold">
              <Star className="w-4 h-4 fill-current" />
              {avgRating}
              <span className="text-gray-400 font-normal">({totalRatings.toLocaleString()})</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-gray-300">
              <Clock className="w-4 h-4" />
              {Math.floor(featuredBook.runtime_length_min / 60)}h {featuredBook.runtime_length_min % 60}m
            </span>
          </div>

          <p className="text-sm text-gray-300 line-clamp-3 mb-6 max-w-2xl leading-relaxed">
            {featuredBook.publisher_summary.replace(/<[^>]+>/g, '')}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
            <button
              onClick={handlePlayToggle}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-audible-orange to-amber-500 text-gray-950 font-bold text-sm flex items-center gap-2.5 shadow-lg shadow-orange-500/25 hover:from-amber-400 hover:to-orange-500 hover:scale-105 active:scale-95 transition-all"
            >
              {isThisBookPlaying ? (
                <>
                  <Pause className="w-5 h-5 fill-current" />
                  <span>Pause Preview</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                  <span>Play Sample Audio</span>
                </>
              )}
            </button>

            <button
              onClick={handleLibraryToggle}
              className={`px-5 py-3 rounded-full font-semibold text-sm flex items-center gap-2 border transition-all ${
                isInLibrary
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                  : 'bg-gray-800/80 border-gray-700 text-gray-200 hover:bg-gray-700/80 hover:text-white'
              }`}
            >
              {isInLibrary ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>In Your Library</span>
                </>
              ) : (
                <>
                  <BookmarkPlus className="w-4 h-4 text-gray-400" />
                  <span>Add to Library</span>
                </>
              )}
            </button>

            <button
              onClick={() => onOpenDetails(featuredBook)}
              className="px-4 py-3 rounded-full text-sm font-semibold text-gray-400 hover:text-white transition-colors"
            >
              View Chapters & Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
