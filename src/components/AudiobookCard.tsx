import React from 'react';
import { Play, Pause, Star, Clock, BookmarkPlus, Check } from 'lucide-react';
import { Audiobook } from '../api/types';
import { usePlayer } from '../context/PlayerContext';
import { audibleService } from '../api/audibleService';

interface AudiobookCardProps {
  book: Audiobook;
  onOpenDetails: (book: Audiobook) => void;
}

export const AudiobookCard: React.FC<AudiobookCardProps> = ({ book, onOpenDetails }) => {
  const { currentBook, isPlaying, playBook, togglePlayPause } = usePlayer();
  const [isInLibrary, setIsInLibrary] = React.useState(false);

  React.useEffect(() => {
    const lib = audibleService.getUserLibrary();
    setIsInLibrary(lib.some((item) => item.asin === book.asin));
  }, [book.asin]);

  const isThisPlaying = currentBook?.asin === book.asin && isPlaying;

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentBook?.asin === book.asin) {
      togglePlayPause();
    } else {
      playBook(book);
    }
  };

  const handleLibraryClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInLibrary) {
      audibleService.removeFromLibrary(book.asin);
      setIsInLibrary(false);
    } else {
      audibleService.addToLibrary(book.asin);
      setIsInLibrary(true);
    }
  };

  const hours = Math.floor(book.runtime_length_min / 60);
  const mins = book.runtime_length_min % 60;
  const rating = book.rating.overall_distribution.average_rating.toFixed(1);
  const coverUrl = (book.product_images['500'] || Object.values(book.product_images)[0] || '') as string;

  return (
    <div
      onClick={() => onOpenDetails(book)}
      className="group relative flex flex-col bg-[#141b24] hover:bg-[#1a2330] rounded-2xl p-3 border border-gray-800/80 hover:border-gray-700 transition-all duration-200 cursor-pointer shadow-md hover:shadow-xl hover:-translate-y-1"
    >
      {/* Artwork Box */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-3 bg-gray-900 shadow-md">
        <img
          src={coverUrl}
          alt={book.title}
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = 'https://m.media-amazon.com/images/I/41wuB-s8vRL._SL500_.jpg';
          }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Runtime Badge */}
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[11px] font-semibold text-gray-200 flex items-center gap-1">
          <Clock className="w-3 h-3 text-audible-orange" />
          <span>{hours > 0 ? `${hours}h ${mins}m` : `${mins}m`}</span>
        </div>

        {/* Play Overlay */}
        <button
          onClick={handlePlayClick}
          aria-label={isThisPlaying ? 'Pause audiobook' : 'Play audiobook'}
          className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-200 ${
            isThisPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-audible-orange text-gray-950 flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform">
            {isThisPlaying ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current ml-0.5" />
            )}
          </div>
        </button>
      </div>

      {/* Book Metadata */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-white text-sm line-clamp-1 group-hover:text-audible-orange transition-colors">
            {book.title}
          </h3>
          <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">
            By {book.authors.map(a => a.name).join(', ')}
          </p>
          <p className="text-xs text-gray-400 line-clamp-1">
            Narrated by {book.narrators.map(n => n.name).join(', ')}
          </p>
        </div>

        {/* Ratings & Quick Library Toggle */}
        <div className="mt-3 pt-2 border-t border-gray-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-amber-400 font-semibold">
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>{rating}</span>
            <span className="text-gray-400 font-normal text-[11px]">
              ({book.rating.overall_distribution.total_ratings.toLocaleString()})
            </span>
          </div>

          <button
            onClick={handleLibraryClick}
            title={isInLibrary ? 'In Your Library' : 'Add to Library'}
            className={`p-1.5 rounded-lg border transition-colors ${
              isInLibrary
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                : 'bg-gray-800/80 border-gray-700/60 text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {isInLibrary ? <Check className="w-3.5 h-3.5" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
