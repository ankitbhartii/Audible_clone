import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Play, Pause, Trash2, Clock, CheckCircle2, BookOpen, Search, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { Audiobook } from '../api/types';
import { audibleService } from '../api/audibleService';
import { usePlayer, formatTime } from '../context/PlayerContext';

interface LibraryViewProps {
  onOpenDetails: (book: Audiobook) => void;
  onBrowseMore: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({ onOpenDetails, onBrowseMore }) => {
  const { currentBook, isPlaying, playBook, togglePlayPause } = usePlayer();
  const [libraryBooks, setLibraryBooks] = useState<Audiobook[]>([]);
  const [filter, setFilter] = useState<'all' | 'in-progress' | 'finished'>('all');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ITEMS_PER_PAGE = 24;

  const reloadLibrary = () => {
    const items = audibleService.getUserLibrary();
    const books = items
      .map((item) => audibleService.getAudiobook(item.asin))
      .filter((b): b is Audiobook => b !== null);
    setLibraryBooks(books);
  };

  useEffect(() => {
    reloadLibrary();
  }, []);

  const handleRemove = (asin: string, e: React.MouseEvent) => {
    e.stopPropagation();
    audibleService.removeFromLibrary(asin);
    reloadLibrary();
  };

  const handleImportAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    const audioTest = new Audio();
    audioTest.src = objectUrl;

    const cleanTitle = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    audioTest.onloadedmetadata = () => {
      const durSec = Math.round(audioTest.duration) || 3600;
      const durMin = Math.round(durSec / 60) || 60;

      const newBook: Audiobook = {
        asin: 'BYO_' + Date.now().toString(36).toUpperCase(),
        title: cleanTitle,
        subtitle: 'Complete Full Edition (Imported)',
        authors: [{ asin: 'B0AUTH_BYO', name: 'Original Author' }],
        narrators: [{ name: 'Full Unabridged Narration' }],
        publisher_name: 'Personal Audio Library',
        release_date: new Date().toISOString(),
        issue_date: new Date().toISOString(),
        runtime_length_min: durMin,
        format_type: 'unabridged',
        language: 'english',
        publisher_summary: `${cleanTitle} — Complete unabridged audiobook edition imported into your personal Audible library. Plays in full with chapter seeking, Whispersync bookmarking, and resume tracking.`,
        product_images: {
          '500': 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
          '1024': 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80'
        },
        rating: {
          overall_distribution: {
            average_rating: 5.0,
            display_average_rating: '5.0',
            total_ratings: 1
          }
        },
        sample_url: objectUrl,
        price: {
          list_price: { amount: 0, currency_code: 'USD' },
          lowest_price: { amount: 0, currency_code: 'USD' }
        },
        category_id: 'imported',
        category_name: 'Imported Audiobooks',
        chapters: [
          {
            id: 'ch-full',
            title: 'Full Unabridged Audiobook',
            start_offset_ms: 0,
            start_offset_sec: 0,
            length_ms: durSec * 1000
          }
        ]
      };

      audibleService.registerLocalAudiobook(newBook);
      reloadLibrary();
      playBook(newBook, 0, 0);
    };

    // Reset input value so same file can be re-imported if needed
    e.target.value = '';
  };

  const filteredBooks = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase();
    return libraryBooks.filter((book) => {
      if (cleanSearch) {
        const matchTitle = book.title.toLowerCase().includes(cleanSearch);
        const matchAuthor = book.authors.some(a => a.name.toLowerCase().includes(cleanSearch));
        const matchNarrator = book.narrators.some(n => n.name.toLowerCase().includes(cleanSearch));
        if (!matchTitle && !matchAuthor && !matchNarrator) return false;
      }

      const progress = audibleService.getListeningProgress(book.asin);
      const pos = progress ? progress.position_ms : 0;
      const total = book.runtime_length_min * 60 * 1000;
      const isFinished = total > 0 && pos >= total * 0.95;

      if (filter === 'in-progress') return pos > 0 && !isFinished;
      if (filter === 'finished') return isFinished;
      return true;
    });
  }, [libraryBooks, filter, search]);

  const totalPages = Math.ceil(filteredBooks.length / ITEMS_PER_PAGE) || 1;
  const paginatedBooks = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredBooks.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBooks, page]);

  return (
    <div className="py-6 sm:py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Title & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-audible-orange" />
            <span>My Audible Library</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {libraryBooks.length} audiobooks in your collection • Unabridged editions with Whispersync
          </p>
        </div>

        {/* Search, Filter Pills & Import Button */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Import Full Audiobook Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportAudio}
            accept="audio/*,.mp3,.m4b,.m4a,.wav,.aac,.ogg"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Import complete audiobook file from your device"
            className="px-3.5 py-2 rounded-xl bg-audible-orange hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-orange-500/20"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Full Audio</span>
          </button>

          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search library..."
              className="bg-[#141b25] border border-gray-800 text-white text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-audible-orange w-44 sm:w-56"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-[#141b25] p-1 rounded-xl border border-gray-800">
            {(['all', 'in-progress', 'finished'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setFilter(tab);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
                  filter === tab
                    ? 'bg-audible-orange text-black'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pagination Bar Top */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mb-4 bg-[#111722] px-4 py-2.5 rounded-xl border border-gray-800/80 text-xs">
          <span className="text-gray-400">
            Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filteredBooks.length)} of {filteredBooks.length} audiobooks
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-gray-800 text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-audible-orange px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-gray-800 text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Library Grid or Empty State */}
      {filteredBooks.length === 0 ? (
        <div className="text-center py-20 bg-[#121824] rounded-3xl border border-dashed border-gray-800 p-8">
          <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">No audiobooks found</h3>
          <p className="text-sm text-gray-400 max-w-md mx-auto mb-6">
            {search ? 'No audiobooks match your search term in your library.' : 'Explore the Audible catalog to discover bestsellers and add them to your library.'}
          </p>
          <button
            onClick={() => {
              setSearch('');
              onBrowseMore();
            }}
            className="px-6 py-2.5 rounded-full bg-audible-orange text-black font-bold text-sm hover:bg-amber-400 transition-colors shadow-lg shadow-orange-500/20"
          >
            Browse Audiobooks Catalog
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedBooks.map((book) => {
            const isPlayingThis = currentBook?.asin === book.asin && isPlaying;
            const progress = audibleService.getListeningProgress(book.asin);
            const posMs = progress ? progress.position_ms : 0;
            const totalMs = book.runtime_length_min * 60 * 1000;
            const percent = totalMs > 0 ? Math.min(100, Math.round((posMs / totalMs) * 100)) : 0;
            const isFinished = percent >= 95;

            return (
              <div
                key={book.asin}
                onClick={() => onOpenDetails(book)}
                className="group relative bg-[#141b25] hover:bg-[#1a2331] border border-gray-800 rounded-2xl p-4 flex gap-4 cursor-pointer transition-all hover:shadow-xl hover:border-gray-700"
              >
                {/* Book Thumbnail */}
                <div className="relative shrink-0 w-24 sm:w-28 aspect-square rounded-xl overflow-hidden bg-gray-900 border border-gray-700 shadow-md">
                  <img
                    src={book.product_images['500']}
                    alt={book.title}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = 'https://m.media-amazon.com/images/I/41wuB-s8vRL._SL500_.jpg';
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (currentBook?.asin === book.asin) {
                        togglePlayPause();
                      } else {
                        playBook(book);
                      }
                    }}
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <div className="w-10 h-10 rounded-full bg-audible-orange text-black flex items-center justify-center shadow-lg">
                      {isPlayingThis ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                    </div>
                  </button>
                </div>

                {/* Info & Progress */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <h3 className="text-sm font-bold text-white truncate group-hover:text-audible-orange transition-colors">
                      {book.title}
                    </h3>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      By {book.authors.map((a) => a.name).join(', ')}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      Narrated by {book.narrators.map((n) => n.name).join(', ')}
                    </p>
                  </div>

                  {/* Progress Bar & Actions */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                      {isFinished ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Finished
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {posMs > 0 ? `${formatTime(posMs / 1000)} played (${percent}%)` : 'Unplayed'}
                        </span>
                      )}
                      <span>{Math.floor(book.runtime_length_min / 60)}h {book.runtime_length_min % 60}m</span>
                    </div>

                    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-audible-orange rounded-full transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    {/* Resume / Listen button */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-800/80">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (currentBook?.asin === book.asin) {
                            togglePlayPause();
                          } else {
                            playBook(book);
                          }
                        }}
                        className="px-3 py-1 rounded-full bg-audible-orange/15 hover:bg-audible-orange/25 text-audible-orange text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        {isPlayingThis ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                        <span>{isPlayingThis ? 'Pause' : posMs > 0 ? 'Resume' : 'Play'}</span>
                      </button>

                      <button
                        onClick={(e) => handleRemove(book.asin, e)}
                        title="Remove from library"
                        className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Bar Bottom */}
      {totalPages > 1 && filteredBooks.length > 0 && (
        <div className="flex items-center justify-between mt-8 bg-[#111722] px-4 py-3 rounded-xl border border-gray-800/80 text-xs">
          <span className="text-gray-400">
            Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filteredBooks.length)} of {filteredBooks.length} audiobooks
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={page === 1}
              className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-gray-800 text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-audible-orange px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => {
                setPage((p) => Math.min(totalPages, p + 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-gray-800 text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
