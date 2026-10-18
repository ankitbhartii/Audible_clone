import React, { useState } from 'react';
import { Search, Headphones, BookOpen, Layers, CloudCheck, X, Sparkles, Check } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

interface NavbarProps {
  currentTab: 'home' | 'library' | 'browse';
  onSelectTab: (tab: 'home' | 'library' | 'browse') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory
}) => {
  const { whispersyncStatus } = usePlayer();
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);

  const categories = [
    { id: 'all', label: 'All Categories' },
    { id: 'sci-fi', label: 'Sci-Fi & Fantasy' },
    { id: 'self-development', label: 'Personal Development & Habits' },
    { id: 'business-money', label: 'Business & Finance' },
    { id: 'mystery-thriller', label: 'Mysteries & Thrillers' },
    { id: 'biography', label: 'Biographies & Memoirs' },
    { id: 'technology', label: 'Computers & Technology' },
    { id: 'fiction', label: 'Literature & Classics' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0c1017]/95 backdrop-blur-md border-b border-gray-800/80 shadow-lg">
      {/* Top Banner / Membership notice */}
      <div className="bg-gradient-to-r from-amber-600/20 via-orange-500/20 to-amber-700/20 border-b border-orange-500/10 px-4 py-1 text-xs text-center text-orange-200/90 font-medium flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-audible-orange" />
        <span>Audible Premium Plus • 1 credit/month + unlimited listening across 10,000+ bestselling audiobooks & originals</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-8">
          <button
            onClick={() => {
              onSelectTab('home');
              onSearchChange('');
              onSelectCategory(null);
            }}
            className="flex items-center gap-2.5 group focus:outline-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-audible-orange to-amber-600 flex items-center justify-center shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
              <Headphones className="w-5 h-5 text-gray-950 font-bold" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xl font-black tracking-tight text-white flex items-center gap-1">
                audible<span className="text-audible-orange font-bold text-xs px-1.5 py-0.5 rounded bg-audible-orange/10 border border-audible-orange/30">CLONE</span>
              </span>
              <span className="text-[10px] text-gray-400 -mt-1 font-medium tracking-wider uppercase">an amazon company</span>
            </div>
          </button>

          {/* Nav Tabs */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => {
                onSelectTab('home');
                onSearchChange('');
                onSelectCategory(null);
              }}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                currentTab === 'home' && !selectedCategory && !searchQuery
                  ? 'text-audible-orange bg-audible-orange/10'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => {
                onSelectTab('browse');
                onSearchChange('');
                onSelectCategory(null);
              }}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors ${
                currentTab === 'browse'
                  ? 'text-audible-orange bg-audible-orange/10'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>All Audiobooks (10,000+)</span>
            </button>
            <button
              onClick={() => onSelectTab('library')}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${
                currentTab === 'library'
                  ? 'text-audible-orange bg-audible-orange/10'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              My Library
            </button>
            
            {/* Categories Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
                className={`px-3.5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${
                  selectedCategory
                    ? 'text-audible-orange bg-audible-orange/10'
                    : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Categories</span>
              </button>

              {isCategoryMenuOpen && (
                <div
                  className="absolute left-0 mt-2 w-56 bg-[#161c26] border border-gray-700/80 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onMouseLeave={() => setIsCategoryMenuOpen(false)}
                >
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        onSelectCategory(cat.id === 'all' ? null : cat.id);
                        onSelectTab('home');
                        setIsCategoryMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-audible-orange/15 hover:text-audible-orange flex items-center justify-between"
                    >
                      <span>{cat.label}</span>
                      {(cat.id === 'all' && !selectedCategory) || selectedCategory === cat.id ? (
                        <Check className="w-4 h-4 text-audible-orange" />
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-md relative">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search audiobooks, authors, narrators..."
              className="w-full bg-[#18202d] text-sm text-gray-100 placeholder-gray-400 pl-10 pr-9 py-2 rounded-full border border-gray-700/70 focus:outline-none focus:border-audible-orange focus:ring-1 focus:ring-audible-orange transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right Section: Whispersync & Profile */}
        <div className="flex items-center gap-3">
          {/* Whispersync Indicator */}
          <div
            title="Amazon Whispersync automatically synchronizes your audio playback position and bookmarks across devices."
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-800/60 border border-gray-700/50 text-xs font-medium text-gray-300"
          >
            <CloudCheck className={`w-3.5 h-3.5 ${whispersyncStatus === 'syncing' ? 'text-amber-400 animate-spin' : 'text-emerald-400'}`} />
            <span className="capitalize">{whispersyncStatus === 'syncing' ? 'Syncing...' : 'Whispersync'}</span>
          </div>

          {/* User Profile Avatar */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 border border-gray-500/30 flex items-center justify-center text-xs font-bold text-white shadow-sm">
              AK
            </div>
            <span className="hidden xl:inline text-xs font-semibold text-gray-300">
              Audible Member
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
