import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Gauge,
  ListMusic,
  Bookmark,
  Moon,
  Maximize2,
  CloudCheck,
  Check
} from 'lucide-react';
import { usePlayer, formatTime } from '../context/PlayerContext';

export const CloudAudioPlayer: React.FC = () => {
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
    sleepTimerMinutes,
    sleepTimerRemaining,
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
    setSleepTimer,
    addBookmark,
    openPlayerModal
  } = usePlayer();

  const [isSpeedOpen, setIsSpeedOpen] = useState(false);
  const [isChaptersOpen, setIsChaptersOpen] = useState(false);
  const [isSleepOpen, setIsSleepOpen] = useState(false);
  const [showBookmarkToast, setShowBookmarkToast] = useState(false);

  if (!currentBook) return null;

  const speeds = [0.5, 0.75, 1.0, 1.2, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0];
  const sleepOptions = [
    { label: 'Off', mins: null },
    { label: '5 minutes', mins: 5 },
    { label: '15 minutes', mins: 15 },
    { label: '30 minutes', mins: 30 },
    { label: '45 minutes', mins: 45 },
    { label: '60 minutes', mins: 60 },
  ];

  const handleBookmarkClick = () => {
    addBookmark();
    setShowBookmarkToast(true);
    setTimeout(() => setShowBookmarkToast(false), 2000);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <aside aria-label="Audio Player" className="fixed bottom-0 left-0 right-0 z-40 bg-[#101622]/98 backdrop-blur-xl border-t border-gray-800 shadow-[0_-8px_30px_rgba(0,0,0,0.8)] px-4 py-2.5 sm:px-6">
      {/* Toast Notification */}
      {showBookmarkToast && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-emerald-600 text-white text-xs font-semibold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4" />
          <span>Bookmark saved at {formatTime(currentTime)}</span>
        </div>
      )}

      {/* Progress Scrubber Bar */}
      <div className="max-w-7xl mx-auto flex items-center gap-3 mb-1">
        <span className="text-[11px] font-mono text-gray-400 w-14 text-right select-none">
          {formatTime(currentTime)}
        </span>
        <div className="relative flex-1 group py-1 flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={1}
            value={currentTime}
            onChange={(e) => seek(parseFloat(e.target.value))}
            aria-label="Audio progress scrub"
            className="w-full h-1.5 bg-gray-800 rounded-full appearance-none cursor-pointer focus:outline-none accent-audible-orange group-hover:h-2 transition-all"
            style={{
              background: `linear-gradient(to right, #f7991c ${progressPercent}%, #283244 ${progressPercent}%)`
            }}
          />
        </div>
        <span className="text-[11px] font-mono text-gray-400 w-16 select-none text-right">
          {formatTime(duration)}
        </span>
      </div>

      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Book & Chapter Info */}
        <div className="flex items-center gap-3 min-w-0 w-1/4">
          <div
            onClick={openPlayerModal}
            className="relative shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-900 border border-gray-700/80 cursor-pointer group shadow-md"
          >
            <img
              src={currentBook.product_images['500']}
              alt={currentBook.title}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = 'https://m.media-amazon.com/images/I/41wuB-s8vRL._SL500_.jpg';
              }}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Maximize2 className="w-4 h-4 text-white" />
            </div>
          </div>

          <div className="min-w-0">
            <h4
              onClick={openPlayerModal}
              className="text-xs sm:text-sm font-bold text-white truncate cursor-pointer hover:text-audible-orange transition-colors"
            >
              {currentBook.title}
            </h4>
            <p className="text-[11px] text-gray-400 truncate">
              {currentChapter ? currentChapter.title : `Chapter ${currentChapterIndex + 1}`} • <span className="text-gray-400 font-mono">{formatTime(Math.max(0, duration - currentTime))} left</span>
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
              <CloudCheck className={`w-3 h-3 ${whispersyncStatus === 'syncing' ? 'text-amber-400 animate-spin' : 'text-emerald-400'}`} />
              <span>Whispersync</span>
            </div>
          </div>
        </div>

        {/* Center: Playback Transport Controls */}
        <div className="flex items-center justify-center gap-3 sm:gap-5 flex-1">
          {/* Previous Chapter */}
          <button
            onClick={prevChapter}
            title="Previous chapter"
            className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Skip Back 30s */}
          <button
            onClick={() => skipSeconds(-30)}
            title="Skip back 30 seconds"
            className="p-2 rounded-full text-gray-300 hover:text-white hover:bg-gray-800 transition-colors flex items-center justify-center relative group"
          >
            <RotateCcw className="w-5 h-5 group-hover:-rotate-12 transition-transform" />
            <span className="absolute text-[9px] font-bold text-gray-300 pointer-events-none">30</span>
          </button>

          {/* Play/Pause Button */}
          <button
            onClick={togglePlayPause}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="w-12 h-12 rounded-full bg-audible-orange text-gray-950 flex items-center justify-center shadow-lg shadow-orange-500/25 hover:scale-105 active:scale-95 transition-transform"
          >
            {isBuffering ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current ml-0.5" />
            )}
          </button>

          {/* Skip Forward 30s */}
          <button
            onClick={() => skipSeconds(30)}
            title="Skip forward 30 seconds"
            className="p-2 rounded-full text-gray-300 hover:text-white hover:bg-gray-800 transition-colors flex items-center justify-center relative group"
          >
            <RotateCw className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span className="absolute text-[9px] font-bold text-gray-300 pointer-events-none">30</span>
          </button>

          {/* Next Chapter */}
          <button
            onClick={nextChapter}
            title="Next chapter"
            className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Extended Controls (Speed, Chapters, Bookmark, Sleep, Volume) */}
        <div className="flex items-center justify-end gap-2 sm:gap-3 w-1/4">
          {/* Playback Speed Popover */}
          <div className="relative">
            <button
              onClick={() => {
                setIsSpeedOpen(!isSpeedOpen);
                setIsChaptersOpen(false);
                setIsSleepOpen(false);
              }}
              title="Playback speed"
              className={`px-2 py-1 rounded-md text-xs font-bold border transition-colors flex items-center gap-1 ${
                playbackSpeed !== 1.0
                  ? 'bg-audible-orange/20 border-audible-orange text-audible-orange'
                  : 'bg-gray-800/80 border-gray-700/80 text-gray-300 hover:text-white'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" />
              <span>{playbackSpeed}x</span>
            </button>

            {isSpeedOpen && (
              <div
                className="absolute bottom-12 right-0 bg-[#161d28] border border-gray-700 rounded-xl shadow-2xl p-2 grid grid-cols-2 gap-1 w-36 z-50 animate-in fade-in"
                onMouseLeave={() => setIsSpeedOpen(false)}
              >
                {speeds.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setSpeed(s);
                      setIsSpeedOpen(false);
                    }}
                    className={`px-2.5 py-1.5 text-xs rounded-lg font-bold transition-colors ${
                      playbackSpeed === s
                        ? 'bg-audible-orange text-black'
                        : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Chapters Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsChaptersOpen(!isChaptersOpen);
                setIsSpeedOpen(false);
                setIsSleepOpen(false);
              }}
              title="Chapters"
              className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <ListMusic className="w-4 h-4" />
            </button>

            {isChaptersOpen && (
              <div
                className="absolute bottom-12 right-0 w-72 max-h-80 overflow-y-auto bg-[#161d28] border border-gray-700 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in"
                onMouseLeave={() => setIsChaptersOpen(false)}
              >
                <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-800 mb-1">
                  Chapters ({currentBook.chapters?.length || 0})
                </div>
                {currentBook.chapters?.map((ch, idx) => (
                  <button
                    key={ch.id}
                    onClick={() => {
                      selectChapter(idx);
                      setIsChaptersOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                      currentChapterIndex === idx
                        ? 'bg-audible-orange/15 text-audible-orange font-bold'
                        : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    <span className="truncate pr-2">{idx + 1}. {ch.title}</span>
                    <span className="text-[11px] text-gray-400 font-mono shrink-0">
                      {formatTime(ch.start_offset_ms / 1000)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bookmark Button */}
          <button
            onClick={handleBookmarkClick}
            title="Add Bookmark at current position"
            className="p-2 rounded-lg text-gray-300 hover:text-audible-orange hover:bg-gray-800 transition-colors"
          >
            <Bookmark className="w-4 h-4" />
          </button>

          {/* Sleep Timer */}
          <div className="relative">
            <button
              onClick={() => {
                setIsSleepOpen(!isSleepOpen);
                setIsSpeedOpen(false);
                setIsChaptersOpen(false);
              }}
              title={sleepTimerRemaining ? `Sleep timer: ${Math.ceil(sleepTimerRemaining / 60)}m left` : 'Sleep timer'}
              className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${
                sleepTimerRemaining
                  ? 'text-audible-orange bg-audible-orange/15'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Moon className="w-4 h-4" />
              {sleepTimerRemaining && (
                <span className="text-[10px] font-bold font-mono">
                  {Math.ceil(sleepTimerRemaining / 60)}m
                </span>
              )}
            </button>

            {isSleepOpen && (
              <div
                className="absolute bottom-12 right-0 bg-[#161d28] border border-gray-700 rounded-xl shadow-2xl p-1.5 w-40 z-50 animate-in fade-in"
                onMouseLeave={() => setIsSleepOpen(false)}
              >
                <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-800 mb-1">
                  Sleep Timer
                </div>
                {sleepOptions.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => {
                      setSleepTimer(opt.mins);
                      setIsSleepOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      sleepTimerMinutes === opt.mins
                        ? 'bg-audible-orange text-black font-bold'
                        : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Volume Control */}
          <div className="hidden md:flex items-center gap-2 group">
            <button
              onClick={toggleMute}
              title={isMuted ? 'Unmute' : 'Mute'}
              className="text-gray-400 hover:text-white"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolumeLevel(parseFloat(e.target.value))}
              aria-label="Volume slider"
              className="w-16 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-audible-orange"
            />
          </div>

          {/* Expand to Full Cloud Player Modal */}
          <button
            onClick={openPlayerModal}
            title="Open Full Cloud Player"
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
