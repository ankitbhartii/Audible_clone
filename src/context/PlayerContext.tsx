import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { Audiobook, Chapter, Bookmark } from '../api/types';
import { audibleService } from '../api/audibleService';

interface PlayerContextType {
  currentBook: Audiobook | null;
  currentChapter: Chapter | null;
  currentChapterIndex: number;
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number; // in seconds along the full audiobook timeline
  duration: number; // full audiobook runtime in seconds (e.g. 5h 35m = 20,100s)
  playbackSpeed: number;
  volume: number;
  isMuted: boolean;
  sleepTimerMinutes: number | null;
  sleepTimerRemaining: number | null; // seconds
  bookmarks: Bookmark[];
  isPlayerModalOpen: boolean;
  whispersyncStatus: 'synced' | 'syncing' | 'idle';
  
  // Controls
  playBook: (book: Audiobook, chapterIndex?: number, positionSeconds?: number) => void;
  togglePlayPause: () => void;
  seek: (timeSeconds: number) => void;
  skipSeconds: (deltaSeconds: number) => void;
  nextChapter: () => void;
  prevChapter: () => void;
  selectChapter: (index: number) => void;
  setSpeed: (speed: number) => void;
  setVolumeLevel: (v: number) => void;
  toggleMute: () => void;
  setSleepTimer: (minutes: number | null) => void;
  addBookmark: (note?: string) => void;
  openPlayerModal: () => void;
  closePlayerModal: () => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentBook, setCurrentBook] = useState<Audiobook | null>(null);
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState<boolean>(false);
  const [whispersyncStatus, setWhispersyncStatus] = useState<'synced' | 'syncing' | 'idle'>('idle');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sleepIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const bufferingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const baseOffsetRef = useRef<number>(0);
  const currentTimeRef = useRef<number>(0);
  const pendingSeekTimeRef = useRef<number | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const shouldPlayRef = useRef<boolean>(false);

  // Full official audiobook runtime in seconds (e.g. 5h 35m = 20,100s)
  const fullBookDuration = currentBook ? currentBook.runtime_length_min * 60 : 3600;

  // Initialize Audio element with robust lifecycle event listeners
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;

    const onPlay = () => {
      setIsPlaying(true);
      isPlayingRef.current = true;
      setIsBuffering(false);
    };
    const onPause = () => {
      setIsPlaying(false);
      isPlayingRef.current = false;
      setIsBuffering(false);
    };
    const onWaiting = () => {
      if (isPlayingRef.current) {
        setIsBuffering(true);
      }
      if (bufferingTimeoutRef.current) clearTimeout(bufferingTimeoutRef.current);
      bufferingTimeoutRef.current = setTimeout(() => {
        setIsBuffering(false);
      }, 1500);
    };
    const onCanPlay = () => {
      setIsBuffering(false);
      if (bufferingTimeoutRef.current) clearTimeout(bufferingTimeoutRef.current);
      if (pendingSeekTimeRef.current !== null && audioRef.current) {
        const fileDur = (audioRef.current.duration && !isNaN(audioRef.current.duration) && audioRef.current.duration > 0)
          ? audioRef.current.duration
          : 80;
        const introBuffer = Math.min(12, fileDur * 0.15);
        const bodyDur = Math.max(10, fileDur - introBuffer);
        const target = pendingSeekTimeRef.current < introBuffer
          ? pendingSeekTimeRef.current
          : introBuffer + ((pendingSeekTimeRef.current - introBuffer) % bodyDur);

        try {
          audioRef.current.currentTime = target;
          baseOffsetRef.current = pendingSeekTimeRef.current - target;
        } catch (e) {
          console.warn('Error seeking during canplay:', e);
        }
        pendingSeekTimeRef.current = null;
      }
      if (shouldPlayRef.current && audioRef.current && audioRef.current.paused) {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
          isPlayingRef.current = true;
          setIsBuffering(false);
        }).catch((err) => {
          console.warn('Play on canplay prevented:', err);
          setIsBuffering(false);
        });
      }
    };
    const onLoadedMetadata = () => {
      setIsBuffering(false);
      if (bufferingTimeoutRef.current) clearTimeout(bufferingTimeoutRef.current);
      if (pendingSeekTimeRef.current !== null && audioRef.current) {
        const fileDur = (audioRef.current.duration && !isNaN(audioRef.current.duration) && audioRef.current.duration > 0)
          ? audioRef.current.duration
          : 80;
        const introBuffer = Math.min(12, fileDur * 0.15);
        const bodyDur = Math.max(10, fileDur - introBuffer);
        const target = pendingSeekTimeRef.current < introBuffer
          ? pendingSeekTimeRef.current
          : introBuffer + ((pendingSeekTimeRef.current - introBuffer) % bodyDur);

        try {
          audioRef.current.currentTime = target;
          baseOffsetRef.current = pendingSeekTimeRef.current - target;
        } catch (e) {
          console.warn('Error seeking during loadedmetadata:', e);
        }
        pendingSeekTimeRef.current = null;
      }
    };
    const onSeeked = () => {
      setIsBuffering(false);
    };
    const onLoadedData = () => {
      setIsBuffering(false);
      if (bufferingTimeoutRef.current) clearTimeout(bufferingTimeoutRef.current);
    };
    const onPlaying = () => {
      setIsBuffering(false);
      setIsPlaying(true);
      isPlayingRef.current = true;
      if (bufferingTimeoutRef.current) clearTimeout(bufferingTimeoutRef.current);
    };
    const onTimeUpdate = () => {
      if (audio.currentTime > 0) {
        setIsBuffering(false);
      }
      // Advance position smoothly along the full audiobook timeline
      const virtualPosition = baseOffsetRef.current + audio.currentTime;
      currentTimeRef.current = virtualPosition;
      setCurrentTime(virtualPosition);
    };
    const onEnded = () => {
      // Loop smoothly along the narration body without restarting intro fanfare
      if (audioRef.current) {
        const fileDur = (audioRef.current.duration && !isNaN(audioRef.current.duration) && audioRef.current.duration > 0)
          ? audioRef.current.duration
          : 80;
        const introBuffer = Math.min(12, fileDur * 0.15);
        baseOffsetRef.current += (fileDur - introBuffer);
        audioRef.current.currentTime = introBuffer;
        audioRef.current.play().catch(console.warn);
      }
    };
    const onError = (e: Event) => {
      console.warn('Audio stream error event:', e);
      setIsBuffering(false);
      // If proxied URL failed, fallback to raw direct samples.audible.com URL
      if (audioRef.current && audioRef.current.src.includes('localhost:3001/api/stream?url=')) {
        try {
          const u = new URL(audioRef.current.src);
          const raw = u.searchParams.get('url');
          if (raw) {
            console.log('Failing over to direct stream:', raw);
            audioRef.current.src = raw;
            audioRef.current.play().catch(console.warn);
          }
        } catch {}
      }
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('seeked', onSeeked);
    audio.addEventListener('loadeddata', onLoadedData);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('seeked', onSeeked);
      audio.removeEventListener('loadeddata', onLoadedData);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.pause();
    };
  }, []);

  // Sync volume and speed to audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [volume, isMuted, playbackSpeed]);

  // Current chapter calculation based on chapters metadata
  const currentChapter = currentBook?.chapters?.[currentChapterIndex] || null;

  // Track and update chapter index based on currentTime along the full timeline
  useEffect(() => {
    if (!currentBook || !currentBook.chapters || currentBook.chapters.length === 0) return;
    const currentMs = currentTime * 1000;
    const chapters = currentBook.chapters;

    for (let i = chapters.length - 1; i >= 0; i--) {
      if (currentMs >= chapters[i].start_offset_ms) {
        if (i !== currentChapterIndex) {
          setCurrentChapterIndex(i);
        }
        break;
      }
    }
  }, [currentTime, currentBook]);

  // Whispersync auto-saver (every 4 seconds during playback)
  useEffect(() => {
    if (!isPlaying || !currentBook) return;

    syncTimerRef.current = setInterval(() => {
      saveProgress(currentTime);
    }, 4000);

    return () => {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    };
  }, [isPlaying, currentBook, currentTime, currentChapterIndex]);

  // Sleep timer ticker
  useEffect(() => {
    if (sleepTimerMinutes === null) {
      setSleepTimerRemaining(null);
      if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current);
      return;
    }

    setSleepTimerRemaining(sleepTimerMinutes * 60);

    sleepIntervalRef.current = setInterval(() => {
      setSleepTimerRemaining((prev) => {
        if (prev === null || prev <= 1) {
          if (audioRef.current) {
            audioRef.current.pause();
          }
          setIsPlaying(false);
          setSleepTimerMinutes(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current);
    };
  }, [sleepTimerMinutes]);

  const saveProgress = useCallback((seconds: number) => {
    if (!currentBook) return;
    setWhispersyncStatus('syncing');
    audibleService.saveListeningProgress(currentBook.asin, {
      positionMs: Math.round(seconds * 1000),
      chapterIndex: currentChapterIndex
    });
    setTimeout(() => {
      setWhispersyncStatus('synced');
    }, 600);
  }, [currentBook, currentChapterIndex]);

  const playBook = async (book: Audiobook, chapterIndex = 0, positionSeconds?: number) => {
    if (!audioRef.current) return;

    setCurrentBook(book);
    setCurrentChapterIndex(chapterIndex);
    setBookmarks(audibleService.getBookmarks(book.asin));

    // Determine target start time along full audiobook timeline
    let startSeconds = 0;
    if (positionSeconds !== undefined) {
      startSeconds = positionSeconds;
    } else {
      const saved = audibleService.getListeningProgress(book.asin);
      if (saved && saved.position_ms > 0) {
        startSeconds = saved.position_ms / 1000;
      } else if (book.chapters && book.chapters[chapterIndex]) {
        startSeconds = book.chapters[chapterIndex].start_offset_ms / 1000;
      }
    }

    // Resolve specific, distinct official audio stream for this exact audiobook
    const audioUrl = await audibleService.resolveOfficialAudio(book);
    
    // Check if new source needs loading
    const currentSrc = audioRef.current.src;
    const isSameSource = currentSrc === audioUrl || currentSrc.endsWith(audioUrl);

    shouldPlayRef.current = true;

    if (!isSameSource) {
      setIsBuffering(true);
      pendingSeekTimeRef.current = startSeconds;
      baseOffsetRef.current = startSeconds;
      currentTimeRef.current = startSeconds;
      setCurrentTime(startSeconds);
      audioRef.current.src = audioUrl;
    } else {
      const fileDur = (audioRef.current.duration && !isNaN(audioRef.current.duration) && audioRef.current.duration > 0)
        ? audioRef.current.duration
        : 80;
      const introBuffer = Math.min(12, fileDur * 0.15);
      const bodyDur = Math.max(10, fileDur - introBuffer);
      const targetAudioTime = startSeconds < introBuffer
        ? startSeconds
        : introBuffer + ((startSeconds - introBuffer) % bodyDur);

      baseOffsetRef.current = startSeconds - targetAudioTime;
      currentTimeRef.current = startSeconds;
      setCurrentTime(startSeconds);
      try {
        audioRef.current.currentTime = targetAudioTime;
      } catch (e) {
        console.warn("Could not set currentTime on same source:", e);
      }
    }

    const playPromise = audioRef.current.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
          isPlayingRef.current = true;
          setIsBuffering(false);
        })
        .catch((err) => {
          console.warn("Autoplay was delayed or prevented, onCanPlay will handle:", err);
        });
    }
    setWhispersyncStatus('synced');
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      shouldPlayRef.current = false;
      audioRef.current.pause();
      setIsPlaying(false);
      isPlayingRef.current = false;
      setIsBuffering(false);
      saveProgress(currentTimeRef.current);
    } else {
      shouldPlayRef.current = true;
      setIsBuffering(true);
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            isPlayingRef.current = true;
            setIsBuffering(false);
          })
          .catch((err) => {
            console.warn("Play error:", err);
            setIsBuffering(false);
          });
      }
    }
  };

  const seek = (timeSeconds: number) => {
    if (!audioRef.current) return;
    const clamped = Math.max(0, Math.min(timeSeconds, fullBookDuration));
    const fileDur = (audioRef.current.duration && !isNaN(audioRef.current.duration) && audioRef.current.duration > 0)
      ? audioRef.current.duration
      : 80;

    const introBuffer = Math.min(12, fileDur * 0.15);
    const bodyDur = Math.max(10, fileDur - introBuffer);
    const targetAudioTime = clamped < introBuffer
      ? clamped
      : introBuffer + ((clamped - introBuffer) % bodyDur);

    baseOffsetRef.current = clamped - targetAudioTime;
    currentTimeRef.current = clamped;
    setCurrentTime(clamped);
    saveProgress(clamped);

    if (audioRef.current.readyState >= 1) {
      try {
        audioRef.current.currentTime = targetAudioTime;
      } catch (e) {
        console.warn("Failed to set currentTime:", e);
      }
    } else {
      pendingSeekTimeRef.current = clamped;
    }
  };

  const skipSeconds = (deltaSeconds: number) => {
    if (!audioRef.current) return;
    const fileDur = (audioRef.current.duration && !isNaN(audioRef.current.duration) && audioRef.current.duration > 0)
      ? audioRef.current.duration
      : 80;

    const currentVirtual = currentTimeRef.current;
    const newVirtual = Math.max(0, Math.min(currentVirtual + deltaSeconds, fullBookDuration));
    currentTimeRef.current = newVirtual;
    setCurrentTime(newVirtual);
    saveProgress(newVirtual);

    const introBuffer = Math.min(12, fileDur * 0.15);
    const bodyDur = Math.max(10, fileDur - introBuffer);

    let newAudioTime = audioRef.current.currentTime + deltaSeconds;
    if (newAudioTime < 0) {
      newAudioTime = 0;
    } else if (newAudioTime >= fileDur) {
      newAudioTime = introBuffer + ((newAudioTime - fileDur) % bodyDur);
    }

    try {
      audioRef.current.currentTime = newAudioTime;
    } catch (e) {
      console.warn("Failed to skip audio currentTime:", e);
    }
    baseOffsetRef.current = newVirtual - newAudioTime;
  };

  const handleAudioEnded = () => {
    if (currentBook && currentBook.chapters && currentChapterIndex < currentBook.chapters.length - 1) {
      selectChapter(currentChapterIndex + 1);
    } else {
      setIsPlaying(false);
      setIsBuffering(false);
    }
  };

  const nextChapter = () => {
    if (!currentBook?.chapters) return;
    if (currentChapterIndex < currentBook.chapters.length - 1) {
      selectChapter(currentChapterIndex + 1);
    }
  };

  const prevChapter = () => {
    if (!currentBook?.chapters) return;
    const chapterStart = currentBook.chapters[currentChapterIndex].start_offset_ms / 1000;
    if (currentTimeRef.current - chapterStart > 3) {
      seek(chapterStart);
    } else if (currentChapterIndex > 0) {
      selectChapter(currentChapterIndex - 1);
    }
  };

  const selectChapter = (index: number) => {
    if (!currentBook?.chapters || !currentBook.chapters[index]) return;
    setCurrentChapterIndex(index);
    const startSec = currentBook.chapters[index].start_offset_ms / 1000;
    seek(startSec);
  };

  const setSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
  };

  const setVolumeLevel = (v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolume(clamped);
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const setSleepTimer = (minutes: number | null) => {
    setSleepTimerMinutes(minutes);
  };

  const addBookmark = (note = '') => {
    if (!currentBook) return;
    const chapterTitle = currentChapter?.title || `Chapter ${currentChapterIndex + 1}`;
    audibleService.addBookmark(currentBook.asin, {
      positionMs: Math.round(currentTime * 1000),
      note: note || `Bookmark at ${formatTime(currentTime)}`,
      chapterTitle
    });
    setBookmarks(audibleService.getBookmarks(currentBook.asin));
  };

  const openPlayerModal = () => setIsPlayerModalOpen(true);
  const closePlayerModal = () => setIsPlayerModalOpen(false);

  return (
    <PlayerContext.Provider
      value={{
        currentBook,
        currentChapter,
        currentChapterIndex,
        isPlaying,
        isBuffering,
        currentTime,
        duration: fullBookDuration,
        playbackSpeed,
        volume,
        isMuted,
        sleepTimerMinutes,
        sleepTimerRemaining,
        bookmarks,
        isPlayerModalOpen,
        whispersyncStatus,
        playBook,
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
        openPlayerModal,
        closePlayerModal
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};

// Helper for display formatting: displays H:MM:SS or M:SS
export const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
