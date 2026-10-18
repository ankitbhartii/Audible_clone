import React, { useState, useMemo, useEffect } from 'react';
import { PlayerProvider } from './context/PlayerContext';
import { Navbar } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { AudiobookShelf } from './components/AudiobookShelf';
import { AudiobookCard } from './components/AudiobookCard';
import { AudiobookDetailModal } from './components/AudiobookDetailModal';
import { CloudAudioPlayer } from './components/CloudAudioPlayer';
import { FullCloudPlayerModal } from './components/FullCloudPlayerModal';
import { LibraryView } from './components/LibraryView';
import { audibleService } from './api/audibleService';
import { Audiobook } from './api/types';
import { Headphones, Shield, Sparkles, Zap, Award, SearchX, ChevronLeft, ChevronRight } from 'lucide-react';

const AudibleApp: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'home' | 'library' | 'browse'>('home');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [detailBook, setDetailBook] = useState<Audiobook | null>(null);
  const [browsePage, setBrowsePage] = useState<number>(1);
  const [searchPage, setSearchPage] = useState<number>(1);
  const [liveSearchResults, setLiveSearchResults] = useState<Audiobook[]>([]);
  const [isLiveSearching, setIsLiveSearching] = useState<boolean>(false);
  const ITEMS_PER_PAGE = 30;

  useEffect(() => {
    setBrowsePage(1);
    setSearchPage(1);
  }, [selectedCategory, searchQuery, currentTab]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setLiveSearchResults([]);
      setIsLiveSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLiveSearching(true);
      try {
        const live = await audibleService.searchLiveAudibleCatalog(searchQuery.trim());
        setLiveSearchResults(live);
      } catch {
        setLiveSearchResults([]);
      } finally {
        setIsLiveSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Combined search across local collection and live 10,000+ Audible catalog
  const searchResults = useMemo(() => {
    const local = audibleService.searchCatalog({
      query: searchQuery || undefined,
      category: selectedCategory || undefined,
      limit: 1000
    }).products;

    if (!liveSearchResults.length) return local;

    const seen = new Set(local.map(b => b.asin));
    const extra = liveSearchResults.filter(b => !seen.has(b.asin));
    return [...local, ...extra];
  }, [searchQuery, selectedCategory, liveSearchResults]);

  // Catalog Shelves by Category
  const bestSellers = useMemo(() => {
    return audibleService.searchCatalog({ sortBy: 'BestSellers', limit: 12 }).products;
  }, []);

  const sciFiBooks = useMemo(() => {
    return audibleService.searchCatalog({ category: 'sci-fi', limit: 12 }).products;
  }, []);

  const selfDevBooks = useMemo(() => {
    return audibleService.searchCatalog({ category: 'self-development', limit: 12 }).products;
  }, []);

  const businessBooks = useMemo(() => {
    return audibleService.searchCatalog({ category: 'business-money', limit: 12 }).products;
  }, []);

  const mysteryBooks = useMemo(() => {
    return audibleService.searchCatalog({ category: 'mystery-thriller', limit: 12 }).products;
  }, []);

  const bioBooks = useMemo(() => {
    return audibleService.searchCatalog({ category: 'biography', limit: 12 }).products;
  }, []);

  const techBooks = useMemo(() => {
    return audibleService.searchCatalog({ category: 'technology', limit: 12 }).products;
  }, []);

  const fictionBooks = useMemo(() => {
    return audibleService.searchCatalog({ category: 'fiction', limit: 12 }).products;
  }, []);

  const allBooks = useMemo(() => {
    return audibleService.searchCatalog({ limit: 1000 }).products;
  }, []);

  const filteredBrowseBooks = useMemo(() => {
    return allBooks.filter(
      (b) =>
        !selectedCategory ||
        b.category_id === selectedCategory ||
        b.category_name?.toLowerCase().includes(selectedCategory.toLowerCase())
    );
  }, [allBooks, selectedCategory]);

  const totalBrowsePages = Math.ceil(filteredBrowseBooks.length / ITEMS_PER_PAGE) || 1;
  const paginatedBrowseBooks = useMemo(() => {
    const start = (browsePage - 1) * ITEMS_PER_PAGE;
    return filteredBrowseBooks.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBrowseBooks, browsePage]);

  const totalSearchPages = Math.ceil(searchResults.length / ITEMS_PER_PAGE) || 1;
  const paginatedSearchResults = useMemo(() => {
    const start = (searchPage - 1) * ITEMS_PER_PAGE;
    return searchResults.slice(start, start + ITEMS_PER_PAGE);
  }, [searchResults, searchPage]);

  // Top featured hero book
  const featuredBook = bestSellers[0] || sciFiBooks[0];

  const isSearchingOrFiltering = Boolean(searchQuery.trim() || selectedCategory);

  return (
    <div className="min-h-screen bg-[#0c1017] text-gray-100 flex flex-col pb-28">
      {/* Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-6 sm:pt-8">
        {currentTab === 'library' ? (
          <LibraryView
            onOpenDetails={setDetailBook}
            onBrowseMore={() => {
              setCurrentTab('browse');
              setSearchQuery('');
              setSelectedCategory(null);
            }}
          />
        ) : currentTab === 'browse' ? (
          /* Full Catalog Explorer View */
          <div className="py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                  <Headphones className="w-7 h-7 text-audible-orange" />
                  <span>Audible Complete Catalog</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  10,000+ unabridged audiobooks with verified voice narration • Connected to Live Audible ASL Catalog
                </p>
              </div>

              {/* Quick Genre Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: null, label: 'All Catalog (10,000+)' },
                  { id: 'self-development', label: 'Personal Development' },
                  { id: 'business-money', label: 'Business & Finance' },
                  { id: 'sci-fi', label: 'Sci-Fi & Fantasy' },
                  { id: 'biography', label: 'Biographies' },
                  { id: 'technology', label: 'Technology' },
                  { id: 'mystery-thriller', label: 'Mysteries' },
                  { id: 'fiction', label: 'Classics' },
                ].map((chip) => (
                  <button
                    key={chip.id || 'all'}
                    onClick={() => {
                      setSelectedCategory(chip.id);
                      setBrowsePage(1);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                      selectedCategory === chip.id
                        ? 'bg-audible-orange text-black font-bold'
                        : 'bg-[#141b25] text-gray-300 hover:text-white border border-gray-800'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pagination Controls Top */}
            {totalBrowsePages > 1 && (
              <div className="flex items-center justify-between mb-4 bg-[#111722] px-4 py-2.5 rounded-xl border border-gray-800/80 text-xs">
                <span className="text-gray-400">
                  Showing {(browsePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(browsePage * ITEMS_PER_PAGE, filteredBrowseBooks.length)} of {filteredBrowseBooks.length} audiobooks
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setBrowsePage((p) => Math.max(1, p - 1))}
                    disabled={browsePage === 1}
                    className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-gray-800 text-white transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-semibold text-audible-orange px-2">
                    Page {browsePage} of {totalBrowsePages}
                  </span>
                  <button
                    onClick={() => setBrowsePage((p) => Math.min(totalBrowsePages, p + 1))}
                    disabled={browsePage === totalBrowsePages}
                    className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-gray-800 text-white transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {paginatedBrowseBooks.map((book) => (
                <AudiobookCard
                  key={book.asin}
                  book={book}
                  onOpenDetails={setDetailBook}
                />
              ))}
            </div>

            {/* Pagination Controls Bottom */}
            {totalBrowsePages > 1 && (
              <div className="flex items-center justify-between mt-8 bg-[#111722] px-4 py-3 rounded-xl border border-gray-800/80 text-xs">
                <span className="text-gray-400">
                  Showing {(browsePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(browsePage * ITEMS_PER_PAGE, filteredBrowseBooks.length)} of {filteredBrowseBooks.length} audiobooks
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setBrowsePage((p) => Math.max(1, p - 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={browsePage === 1}
                    className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-gray-800 text-white transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-semibold text-audible-orange px-2">
                    Page {browsePage} of {totalBrowsePages}
                  </span>
                  <button
                    onClick={() => {
                      setBrowsePage((p) => Math.min(totalBrowsePages, p + 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={browsePage === totalBrowsePages}
                    className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-gray-800 text-white transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : isSearchingOrFiltering ? (
          /* Filtered Search Results Grid */
          <div className="py-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-emerald-400 mb-2">
                  <span className={`w-2 h-2 rounded-full bg-emerald-400 ${isLiveSearching ? 'animate-ping' : ''}`} />
                  <span>{isLiveSearching ? 'Searching Live Audible Catalog (10,000+ Titles)...' : 'Connected to Live Audible ASL Catalog (10,000+ Titles)'}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {searchQuery ? `Search Results for "${searchQuery}"` : 'Filtered Audiobooks'}
                </h1>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  Found {searchResults.length} {searchResults.length === 1 ? 'title' : 'titles'}
                  {selectedCategory && ` in selected category`}
                </p>
              </div>

              {(searchQuery || selectedCategory) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory(null);
                  }}
                  className="text-xs text-audible-orange hover:underline font-semibold"
                >
                  Clear all filters
                </button>
              )}
            </div>

            {searchResults.length === 0 ? (
              <div className="text-center py-24 bg-[#111722] rounded-3xl border border-dashed border-gray-800 p-8">
                <SearchX className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white mb-1">No matching audiobooks found</h3>
                <p className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto mb-6">
                  Try checking your spelling, using broader search terms, or clearing your active category filter.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory(null);
                  }}
                  className="px-5 py-2.5 rounded-full bg-audible-orange text-black font-bold text-xs"
                >
                  Reset Search
                </button>
              </div>
            ) : (
              <>
                {/* Search Pagination Top */}
                {totalSearchPages > 1 && (
                  <div className="flex items-center justify-between mb-4 bg-[#111722] px-4 py-2.5 rounded-xl border border-gray-800/80 text-xs">
                    <span className="text-gray-400">
                      Showing {(searchPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(searchPage * ITEMS_PER_PAGE, searchResults.length)} of {searchResults.length} audiobooks
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSearchPage((p) => Math.max(1, p - 1))}
                        disabled={searchPage === 1}
                        className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-gray-800 text-white transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="font-semibold text-audible-orange px-2">
                        Page {searchPage} of {totalSearchPages}
                      </span>
                      <button
                        onClick={() => setSearchPage((p) => Math.min(totalSearchPages, p + 1))}
                        disabled={searchPage === totalSearchPages}
                        className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-gray-800 text-white transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {paginatedSearchResults.map((book) => (
                    <AudiobookCard
                      key={book.asin}
                      book={book}
                      onOpenDetails={setDetailBook}
                    />
                  ))}
                </div>

                {/* Search Pagination Bottom */}
                {totalSearchPages > 1 && (
                  <div className="flex items-center justify-between mt-8 bg-[#111722] px-4 py-3 rounded-xl border border-gray-800/80 text-xs">
                    <span className="text-gray-400">
                      Showing {(searchPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(searchPage * ITEMS_PER_PAGE, searchResults.length)} of {searchResults.length} audiobooks
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSearchPage((p) => Math.max(1, p - 1));
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        disabled={searchPage === 1}
                        className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-gray-800 text-white transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="font-semibold text-audible-orange px-2">
                        Page {searchPage} of {totalSearchPages}
                      </span>
                      <button
                        onClick={() => {
                          setSearchPage((p) => Math.min(totalSearchPages, p + 1));
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        disabled={searchPage === totalSearchPages}
                        className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-gray-800 text-white transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* Default Home Browse View */
          <div>
            {/* Hero Banner Spotlight */}
            {featuredBook && (
              <HeroBanner
                featuredBook={featuredBook}
                onOpenDetails={setDetailBook}
              />
            )}

            {/* Quick Benefits Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-[#131a26] border border-gray-800/80 mb-10 text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-500/10 text-audible-orange">
                  <Headphones className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white">Unabridged Audio</div>
                  <div className="text-gray-400 text-[11px]">World-class spoken narration</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white">Whispersync</div>
                  <div className="text-gray-400 text-[11px]">Sync across devices</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white">Audible Originals</div>
                  <div className="text-gray-400 text-[11px]">Exclusive productions</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white">Keep Forever</div>
                  <div className="text-gray-400 text-[11px]">Yours to listen anytime</div>
                </div>
              </div>
            </div>

            {/* Shelves Rows */}
            <AudiobookShelf
              title="Audible Bestsellers"
              subtitle="The most listened to titles this week"
              books={bestSellers}
              onOpenDetails={setDetailBook}
            />

            <AudiobookShelf
              title="Personal Development & Habits"
              subtitle="High-impact productivity, psychology, and lifelong growth"
              books={selfDevBooks}
              onOpenDetails={setDetailBook}
            />

            <AudiobookShelf
              title="Business, Wealth & Psychology"
              subtitle="Timeless lessons on money, entrepreneurship, and strategy"
              books={businessBooks}
              onOpenDetails={setDetailBook}
            />

            <AudiobookShelf
              title="Sci-Fi & Epic Fantasy"
              subtitle="Immersive universes, space operas, and magical realms"
              books={sciFiBooks}
              onOpenDetails={setDetailBook}
            />

            <AudiobookShelf
              title="Biographies & Memoirs"
              subtitle="Remarkable lives, innovators, and world leaders"
              books={bioBooks}
              onOpenDetails={setDetailBook}
            />

            <AudiobookShelf
              title="Mysteries & Psychological Thrillers"
              subtitle="Gripping investigations, detective classics, and edge-of-your-seat suspense"
              books={mysteryBooks}
              onOpenDetails={setDetailBook}
            />

            <AudiobookShelf
              title="Computers, Code & Technology"
              subtitle="Software engineering masterpieces and digital system design"
              books={techBooks}
              onOpenDetails={setDetailBook}
            />

            <AudiobookShelf
              title="Literature & Fiction Classics"
              subtitle="Enduring literary treasures and quintessential novels"
              books={fictionBooks}
              onOpenDetails={setDetailBook}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-gray-800/80 bg-[#0a0d14] py-12 text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="space-y-1">
            <div className="font-bold text-gray-300 flex items-center justify-center md:justify-start gap-1">
              <span>Audible Web Clone</span>
              <span className="text-[10px] text-audible-orange font-mono bg-audible-orange/10 px-1 rounded">v1.0.0</span>
            </div>
            <p>© 2026 Audible Web Clone. Built with React 19, TypeScript, Tailwind CSS & HTML5 Web Audio.</p>
            <p className="text-[11px] text-gray-600">Sample audio streams, metadata schemas, and Whispersync synchronization reverse engineered from the Amazon Audible Service Layer (ASL 1.0).</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-gray-400">
            <a href="#privacy" className="hover:text-audible-orange transition-colors">Privacy Notice</a>
            <a href="#conditions" className="hover:text-audible-orange transition-colors">Conditions of Use</a>
            <a href="#help" className="hover:text-audible-orange transition-colors">Help Center</a>
            <a href="#whispersync" className="hover:text-audible-orange transition-colors">Whispersync for Voice</a>
          </div>
        </div>
      </footer>

      {/* Audiobook Details Modal */}
      <AudiobookDetailModal
        book={detailBook}
        onClose={() => setDetailBook(null)}
      />

      {/* Sticky Bottom Cloud Audio Player */}
      <CloudAudioPlayer />

      {/* Full-Screen Dedicated Cloud Player Modal */}
      <FullCloudPlayerModal />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <PlayerProvider>
      <AudibleApp />
    </PlayerProvider>
  );
};

export default App;
