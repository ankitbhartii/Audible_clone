import React, { useState } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ListMusic,
  Bookmark,
  CloudCheck,
  Plus,
  Clock,
  Sparkles
} from 'lucide-react';
import { usePlayer, formatTime } from '../context/PlayerContext';

export const FullCloudPlayerModal: React.FC = () => {
  const {
    currentBook,
    currentChapter,
    currentChapterIndex,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    playbackSpeed,
    volume,
    isMuted,
    bookmarks,
    isPlayerModalOpen,
    whispersyncStatus,
    togglePlayPause,
    seek,
    skipSeconds,
    nextChapter,
    prevChapter,
    selectChapter,
    setSpeed,
    setVolumeLevel,
    toggleMute,
    addBookmark,
    closePlayerModal
  } = usePlayer();

  const [activeTab, setActiveTab] = useState<'chapters' | 'bookmarks'>('chapters');
  const [newBookmarkNote, setNewBookmarkNote] = useState('');
  const [isAddingBookmark, setIsAddingBookmark] = useState(false);

  if (!isPlayerModalOpen || !currentBook) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];

  const handleCreateBookmark = (e: React.FormEvent) => {
    e.preventDefault();
    addBookmark(newBookmarkNote);
    setNewBookmarkNote('');
    setIsAddingBookmark(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-5xl h-[92vh] bg-[#0f141f] border border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closePlayerModal}
          className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Half: Audio Stage & Big Player Display */}
        <div className="flex-1 p-6 sm:p-10 flex flex-col justify-between items-center text-center bg-gradient-to-b from-[#161d2b] to-[#0d121b] border-b md:border-b-0 md:border-r border-gray-800/80 overflow-y-auto">
          {/* Header pill */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-audible-orange/15 border border-audible-orange/30 text-xs font-semibold text-audible-orange">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Audible Cloud Player</span>
          </div>

          {/* Big Album Art with ambient glow */}
          <div className="relative my-6 group">
            <div
              className={`w-52 sm:w-64 md:w-72 aspect-square rounded-2xl overflow-hidden shadow-2xl border-2 border-gray-700/60 transition-transform duration-500 ${
                isPlaying ? 'scale-102 shadow-orange-500/20' : ''
              }`}
            >
              <img
                src={currentBook.product_images['500'] || Object.values(currentBook.product_images)[0] || ''}
                alt={currentBook.title}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = 'https://m.media-amazon.com/images/I/41wuB-s8vRL._SL500_.jpg';
                }}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Spinning decorative vinyl behind */}
            <div
              className={`absolute -inset-2 bg-gradient-to-r from-audible-orange/20 to-amber-500/20 rounded-3xl blur-xl -z-10 transition-opacity duration-1000 ${
                isPlaying ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </div>

          {/* Title & Author */}
          <div className="max-w-md">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight line-clamp-1 mb-1">
              {currentBook.title}
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 font-medium line-clamp-1">
              By {currentBook.authors.map((a) => a.name).join(', ')}
            </p>
            <p className="text-xs text-audible-orange font-semibold mt-1">
              {currentChapter ? currentChapter.title : `Chapter ${currentChapterIndex + 1}`}
            </p>
          </div>

          {/* Scrubber Timeline */}
          <div className="w-full max-w-md my-4">
            <div className="relative flex items-center group py-2">
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.5}
                value={currentTime}
                onChange={(e) => seek(parseFloat(e.target.value))}
                aria-label="Seek progress"
                className="w-full h-2 bg-gray-800 rounded-full appearance-none cursor-pointer focus:outline-none accent-audible-orange"
                style={{
                  background: `linear-gradient(to right, #f7991c ${progressPercent}%, #283244 ${progressPercent}%)`
                }}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-mono text-gray-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Primary Controls */}
          <div className="flex items-center justify-center gap-6 my-2">
            <button
              onClick={prevChapter}
              title="Previous chapter"
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={() => skipSeconds(-30)}
              title="Skip -30 seconds"
              className="p-2.5 rounded-full bg-gray-800/80 hover:bg-gray-700 text-gray-200 transition-colors flex items-center justify-center relative group"
            >
              <RotateCcw className="w-6 h-6 group-hover:-rotate-12 transition-transform" />
              <span className="absolute text-[10px] font-bold">30</span>
            </button>

            <button
              onClick={togglePlayPause}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="w-16 h-16 rounded-full bg-audible-orange text-gray-950 flex items-center justify-center shadow-xl shadow-orange-500/30 hover:scale-105 active:scale-95 transition-transform"
            >
              {isBuffering ? (
                <div className="w-6 h-6 border-3 border-black border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-8 h-8 fill-current" />
              ) : (
                <Play className="w-8 h-8 fill-current ml-1" />
              )}
            </button>

            <button
              onClick={() => skipSeconds(30)}
              title="Skip +30 seconds"
              className="p-2.5 rounded-full bg-gray-800/80 hover:bg-gray-700 text-gray-200 transition-colors flex items-center justify-center relative group"
            >
              <RotateCw className="w-6 h-6 group-hover:rotate-12 transition-transform" />
              <span className="absolute text-[10px] font-bold">30</span>
            </button>

            <button
              onClick={nextChapter}
              title="Next chapter"
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {/* Secondary Controls: Speed pills & Volume */}
          <div className="flex items-center justify-between w-full max-w-md pt-3 border-t border-gray-800/80 text-xs">
            {/* Speed pills */}
            <div className="flex items-center gap-1">
              <span className="text-gray-400 mr-1">Speed:</span>
              {speeds.map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2 py-0.5 rounded-md font-bold transition-colors ${
                    playbackSpeed === s
                      ? 'bg-audible-orange text-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Volume */}
            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className="text-gray-400 hover:text-white">
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolumeLevel(parseFloat(e.target.value))}
                aria-label="Volume slider modal"
                className="w-20 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-audible-orange"
              />
            </div>
          </div>
        </div>

        {/* Right Half: Chapter List & Bookmarks Side Drawer */}
        <div className="w-full md:w-96 flex flex-col bg-[#111724]">
          {/* Tabs */}
          <div className="flex items-center border-b border-gray-800 px-6 pt-4">
            <button
              onClick={() => setActiveTab('chapters')}
              className={`pb-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'chapters'
                  ? 'border-audible-orange text-audible-orange'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <ListMusic className="w-4 h-4" />
              <span>Chapters ({currentBook.chapters?.length || 0})</span>
            </button>
            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`pb-3 ml-6 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'bookmarks'
                  ? 'border-audible-orange text-audible-orange'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              <span>Bookmarks ({bookmarks.length})</span>
            </button>
          </div>

          {/* Whispersync Status Notice */}
          <div className="px-6 py-2.5 bg-gray-900/40 border-b border-gray-800/80 flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-1.5">
              <CloudCheck className={`w-3.5 h-3.5 ${whispersyncStatus === 'syncing' ? 'text-amber-400 animate-spin' : 'text-emerald-400'}`} />
              <span>{whispersyncStatus === 'syncing' ? 'Syncing with Whispersync...' : 'Whispersync synced'}</span>
            </div>
            <span className="text-[11px] text-gray-400">All devices</span>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
            {activeTab === 'chapters' && (
              <>
                {currentBook.chapters?.map((chap, idx) => {
                  const isActive = currentChapterIndex === idx;
                  return (
                    <button
                      key={chap.id}
                      onClick={() => selectChapter(idx)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl text-left border transition-all ${
                        isActive
                          ? 'bg-audible-orange/15 border-audible-orange/40 text-audible-orange font-bold'
                          : 'bg-gray-800/20 border-transparent hover:bg-gray-800/50 text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate pr-2">
                        <span className={`w-6 text-xs ${isActive ? 'text-audible-orange' : 'text-gray-400'}`}>
                          {idx + 1}.
                        </span>
                        <span className="text-xs truncate">{chap.title}</span>
                      </div>
                      <span className="text-[11px] font-mono text-gray-400 shrink-0">
                        {formatTime(chap.start_offset_ms / 1000)}
                      </span>
                    </button>
                  );
                })}
              </>
            )}

            {activeTab === 'bookmarks' && (
              <div className="space-y-3">
                {/* Add Bookmark Trigger */}
                {!isAddingBookmark ? (
                  <button
                    onClick={() => setIsAddingBookmark(true)}
                    className="w-full py-2.5 px-4 rounded-xl border border-dashed border-gray-700 hover:border-audible-orange text-gray-300 hover:text-audible-orange text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Bookmark Current Position ({formatTime(currentTime)})</span>
                  </button>
                ) : (
                  <form onSubmit={handleCreateBookmark} className="p-3 bg-gray-800/40 rounded-xl border border-gray-700 space-y-2">
                    <div className="text-xs font-semibold text-gray-200">
                      Add Note at {formatTime(currentTime)}
                    </div>
                    <input
                      type="text"
                      value={newBookmarkNote}
                      onChange={(e) => setNewBookmarkNote(e.target.value)}
                      placeholder="Enter a bookmark note..."
                      className="w-full bg-gray-900 text-xs text-white p-2 rounded-lg border border-gray-700 focus:outline-none focus:border-audible-orange"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingBookmark(false)}
                        className="px-3 py-1 rounded text-xs text-gray-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 bg-audible-orange text-black font-bold rounded text-xs hover:bg-amber-400"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                )}

                {/* Saved Bookmarks */}
                {bookmarks.length === 0 ? (
                  <div className="text-center py-8 text-xs text-gray-400">
                    No bookmarks saved for this title yet.
                  </div>
                ) : (
                  bookmarks.map((bm) => (
                    <button
                      key={bm.id}
                      onClick={() => seek(bm.position_ms / 1000)}
                      className="w-full p-3 rounded-xl bg-gray-800/40 hover:bg-gray-800 border border-gray-750 text-left transition-colors group"
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-audible-orange flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          {formatTime(bm.position_ms / 1000)}
                        </span>
                        <span className="text-[10px] text-gray-400">{bm.chapter_title}</span>
                      </div>
                      <div className="text-xs text-gray-200 line-clamp-2">
                        {bm.note || 'Bookmark'}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
