import {
  Audiobook,
  Bookmark,
  Category,
  LibraryItem,
  ListeningProgress,
  SearchResult,
  SearchCatalogParams,
} from './types';
import { INITIAL_LIBRARY_ITEMS, MOCK_AUDIOBOOKS, MOCK_CATEGORIES } from './mockData';

const STORAGE_KEYS = {
  LIBRARY: 'audible_web_clone_library_v7',
  PROGRESS: 'audible_web_clone_progress_v2',
  BOOKMARKS: 'audible_web_clone_bookmarks_v2',
} as const;

/**
 * Storage adapter with safe in-memory fallback for SSR and non-browser environments.
 * Wrapped in try-catch to guarantee QuotaExceededError never halts page execution.
 */
class StorageAdapter {
  private memoryStore: Map<string, string> = new Map();

  private isLocalStorageAvailable(): boolean {
    try {
      return (
        typeof window !== 'undefined' &&
        typeof window.localStorage !== 'undefined' &&
        window.localStorage !== null
      );
    } catch {
      return false;
    }
  }

  getItem(key: string): string | null {
    try {
      if (this.isLocalStorageAvailable()) {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch {
      // Graceful fallback to in-memory store
    }
    return this.memoryStore.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    try {
      if (this.isLocalStorageAvailable()) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // QuotaExceededError or restricted context: try clearing legacy keys first
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          for (let i = 1; i <= 6; i++) {
            window.localStorage.removeItem(`audible_web_clone_library_v${i}`);
          }
          window.localStorage.setItem(key, value);
        }
      } catch {
        // Fallback to in-memory storage safely without throwing
      }
    }
    this.memoryStore.set(key, value);
  }

  removeItem(key: string): void {
    try {
      if (this.isLocalStorageAvailable()) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Ignore
    }
    this.memoryStore.delete(key);
  }
}

/**
 * AudibleService - High level service layer for Audible Web Clone.
 * Implements catalog discovery, library management, and Whispersync listening sync.
 */
export class AudibleService {
  private storage: StorageAdapter;
  private catalog: Audiobook[];
  private categories: Category[];

  constructor(
    customStorage?: StorageAdapter,
    customCatalog?: Audiobook[],
    customCategories?: Category[]
  ) {
    this.storage = customStorage ?? new StorageAdapter();
    this.catalog = customCatalog ?? [...MOCK_AUDIOBOOKS];
    this.categories = customCategories ?? [...MOCK_CATEGORIES];
    this.initDefaultLibrary();
  }

  private initDefaultLibrary(): void {
    try {
      // Purge old versions to free browser storage
      if (typeof window !== 'undefined' && window.localStorage) {
        for (let i = 1; i <= 6; i++) {
          window.localStorage.removeItem(`audible_web_clone_library_v${i}`);
        }
      }
    } catch {}

    try {
      const existingStr = this.storage.getItem(STORAGE_KEYS.LIBRARY);
      if (!existingStr) {
        // Clean slate or upgrade to official Audible covers & unique audio streams
        this.storage.setItem(
          STORAGE_KEYS.LIBRARY,
          JSON.stringify(INITIAL_LIBRARY_ITEMS)
        );
      } else {
        const existing = JSON.parse(existingStr);
        if (Array.isArray(existing)) {
          // Sync official product_images and unique sample_url from updated MOCK_AUDIOBOOKS into existing library items
          const bookMap = new Map(MOCK_AUDIOBOOKS.map((b) => [b.asin, b]));
          const updated = existing.map((item: any) => {
            const fresh = bookMap.get(item.asin);
            if (fresh) {
              return {
                ...item,
                product: fresh,
              };
            }
            return item;
          });

          // Also merge any missing books
          const existingAsins = new Set(updated.map((item: any) => item.asin));
          const newItems = INITIAL_LIBRARY_ITEMS.filter((item) => !existingAsins.has(item.asin));
          const merged = [...updated, ...newItems];

          this.storage.setItem(STORAGE_KEYS.LIBRARY, JSON.stringify(merged));
        }
      }
    } catch {
      try {
        this.storage.setItem(
          STORAGE_KEYS.LIBRARY,
          JSON.stringify(INITIAL_LIBRARY_ITEMS)
        );
      } catch {}
    }
  }

  /**
   * Search and filter the audiobook catalog (synchronous for instant UI rendering)
   */
  searchCatalog(params: {
    query?: string;
    category?: string;
    sortBy?: string;
    page?: number;
    limit?: number;
  } = {}): SearchResult {
    const {
      query = '',
      category = '',
      sortBy = 'Relevance',
      page = 0,
      limit = 20,
    } = params;

    let results = [...this.catalog];

    // Filter by text query across title, authors, narrators, and summary
    const cleanQuery = query.trim().toLowerCase();
    if (cleanQuery) {
      results = results.filter((book) => {
        const titleMatch = book.title.toLowerCase().includes(cleanQuery);
        const subtitleMatch = book.subtitle?.toLowerCase().includes(cleanQuery);
        const authorMatch = book.authors.some((a) =>
          a.name.toLowerCase().includes(cleanQuery)
        );
        const narratorMatch = book.narrators.some((n) =>
          n.name.toLowerCase().includes(cleanQuery)
        );
        const publisherMatch = book.publisher_name
          .toLowerCase()
          .includes(cleanQuery);
        const summaryMatch = book.publisher_summary
          .toLowerCase()
          .includes(cleanQuery);

        return (
          titleMatch ||
          subtitleMatch ||
          authorMatch ||
          narratorMatch ||
          publisherMatch ||
          summaryMatch
        );
      });
    }

    // Filter by category or genre id
    if (category && category !== 'all') {
      const catLower = category.toLowerCase();
      results = results.filter(
        (book) =>
          book.category_id?.toLowerCase() === catLower ||
          book.category_name?.toLowerCase().includes(catLower)
      );
    }

    // Sort catalog results
    switch (sortBy) {
      case 'BestSellers':
        results.sort(
          (a, b) =>
            b.rating.overall_distribution.total_ratings -
            a.rating.overall_distribution.total_ratings
        );
        break;
      case 'AvgRating':
        results.sort(
          (a, b) =>
            b.rating.overall_distribution.average_rating -
            a.rating.overall_distribution.average_rating
        );
        break;
      case '-ReleaseDate':
        results.sort(
          (a, b) =>
            new Date(b.release_date).getTime() -
            new Date(a.release_date).getTime()
        );
        break;
      case 'RuntimeLength':
        results.sort((a, b) => b.runtime_length_min - a.runtime_length_min);
        break;
      case 'TitleAZ':
        results.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'Relevance':
      default:
        // When searching, sort higher matches on title/author first
        if (cleanQuery) {
          results.sort((a, b) => {
            const aExact = a.title.toLowerCase().includes(cleanQuery) ? 2 : 0;
            const bExact = b.title.toLowerCase().includes(cleanQuery) ? 2 : 0;
            return bExact - aExact;
          });
        }
        break;
    }

    const total_results = results.length;
    const startIndex = page * limit;
    const paginatedProducts = results.slice(startIndex, startIndex + limit);

    return {
      products: paginatedProducts,
      total_results,
      page,
      limit,
      response_groups: ['contributors', 'media', 'price', 'rating', 'sample'],
    };
  }

  /**
   * Get complete audiobook details by ASIN
   */
  getAudiobook(asin: string): Audiobook | null {
    const book = this.catalog.find((b) => b.asin === asin);
    if (!book) {
      // Check in library
      const library = this.getUserLibrary();
      const libItem = library.find((i) => i.asin === asin);
      return libItem ? libItem.product : null;
    }
    return book;
  }

  /**
   * Get category taxonomy tree
   */
  getCategories(): Category[] {
    return this.categories;
  }

  /**
   * Get audiobooks in user's library
   */
  getUserLibrary(): LibraryItem[] {
    const stored = this.storage.getItem(STORAGE_KEYS.LIBRARY);
    if (!stored) {
      this.storage.setItem(STORAGE_KEYS.LIBRARY, JSON.stringify(INITIAL_LIBRARY_ITEMS));
      return [...INITIAL_LIBRARY_ITEMS];
    }
    try {
      const items = JSON.parse(stored) as LibraryItem[];
      if (items.length < INITIAL_LIBRARY_ITEMS.length) {
        const existingAsins = new Set(items.map((i) => i.asin));
        for (const item of INITIAL_LIBRARY_ITEMS) {
          if (!existingAsins.has(item.asin)) {
            items.push(item);
          }
        }
        this.storage.setItem(STORAGE_KEYS.LIBRARY, JSON.stringify(items));
      }
      return items;
    } catch {
      return [...INITIAL_LIBRARY_ITEMS];
    }
  }

  /**
   * Register a user-imported full audiobook into catalog and library
   */
  registerLocalAudiobook(book: Audiobook): void {
    this.catalog.unshift(book);
    const library = this.getUserLibrary();
    if (!library.some((item) => item.asin === book.asin)) {
      const newItem: LibraryItem = {
        asin: book.asin,
        purchase_date: new Date().toISOString(),
        status: 'Available',
        origin_type: 'AudiblePurchase',
        is_downloaded: true,
        product: book,
      };
      library.unshift(newItem);
      this.storage.setItem(STORAGE_KEYS.LIBRARY, JSON.stringify(library));
    }
  }

  /**
   * Add an audiobook to user library
   */
  addToLibrary(asin: string): LibraryItem {
    const library = this.getUserLibrary();
    const existing = library.find((item) => item.asin === asin);
    if (existing) {
      return existing;
    }

    const book = this.getAudiobook(asin);
    if (!book) {
      throw new Error(`Audiobook with ASIN "${asin}" not found in catalog.`);
    }

    const newItem: LibraryItem = {
      asin,
      purchase_date: new Date().toISOString(),
      status: 'Available',
      origin_type: 'AudiblePurchase',
      is_downloaded: false,
      product: book,
    };

    const updated = [newItem, ...library];
    this.storage.setItem(STORAGE_KEYS.LIBRARY, JSON.stringify(updated));
    return newItem;
  }

  /**
   * Remove an audiobook from user library
   */
  removeFromLibrary(asin: string): boolean {
    const library = this.getUserLibrary();
    const initialLength = library.length;
    const updated = library.filter((item) => item.asin !== asin);

    if (updated.length !== initialLength) {
      this.storage.setItem(STORAGE_KEYS.LIBRARY, JSON.stringify(updated));
      return true;
    }
    return false;
  }

  /**
   * Get Whispersync listening position progress for an audiobook
   */
  getListeningProgress(asin: string): ListeningProgress | null {
    const stored = this.storage.getItem(STORAGE_KEYS.PROGRESS);
    if (!stored) return null;

    try {
      const progressMap = JSON.parse(stored) as Record<string, ListeningProgress>;
      return progressMap[asin] || null;
    } catch {
      return null;
    }
  }

  /**
   * Save Whispersync listening position progress
   */
  saveListeningProgress(
    asin: string,
    progress: { positionMs: number; chapterIndex: number }
  ): ListeningProgress {
    const stored = this.storage.getItem(STORAGE_KEYS.PROGRESS);
    let progressMap: Record<string, ListeningProgress> = {};

    if (stored) {
      try {
        progressMap = JSON.parse(stored);
      } catch {
        progressMap = {};
      }
    }

    const updatedRecord: ListeningProgress = {
      asin,
      position_ms: Math.max(0, Math.floor(progress.positionMs)),
      chapter_index: Math.max(0, Math.floor(progress.chapterIndex)),
      last_updated: new Date().toISOString(),
      device_type: 'AudibleWebClone',
      device_id: 'browser-whispersync-session',
    };

    progressMap[asin] = updatedRecord;
    this.storage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progressMap));

    return updatedRecord;
  }

  /**
   * Get user bookmarks for an audiobook
   */
  getBookmarks(asin: string): Bookmark[] {
    const stored = this.storage.getItem(STORAGE_KEYS.BOOKMARKS);
    if (!stored) return [];

    try {
      const bookmarkMap = JSON.parse(stored) as Record<string, Bookmark[]>;
      return bookmarkMap[asin] || [];
    } catch {
      return [];
    }
  }

  /**
   * Add a new bookmark with note and timestamp
   */
  addBookmark(
    asin: string,
    bookmark: { positionMs: number; note: string; chapterTitle: string }
  ): Bookmark {
    const stored = this.storage.getItem(STORAGE_KEYS.BOOKMARKS);
    let bookmarkMap: Record<string, Bookmark[]> = {};

    if (stored) {
      try {
        bookmarkMap = JSON.parse(stored);
      } catch {
        bookmarkMap = {};
      }
    }

    const currentList = bookmarkMap[asin] || [];
    const newBookmark: Bookmark = {
      id: `bm_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      asin,
      position_ms: Math.max(0, Math.floor(bookmark.positionMs)),
      chapter_title: bookmark.chapterTitle,
      note: bookmark.note.trim(),
      created_at: new Date().toISOString(),
    };

    bookmarkMap[asin] = [newBookmark, ...currentList];
    this.storage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarkMap));

    return newBookmark;
  }

  /**
   * Search live public Audible catalog via local REA stream relay proxy
   */
  async searchLiveAudibleCatalog(query: string): Promise<Audiobook[]> {
    try {
      const res = await fetch(`http://localhost:3001/api/audible/search?query=${encodeURIComponent(query)}&num_results=20`);
      if (res.ok) {
        const data = await res.json();
        return data.products || [];
      }
    } catch {
      // Proxy not running or network offline, gracefully fall back
    }
    return [];
  }

  /**
   * Fetch curated open public-domain unabridged audiobooks
   */
  async fetchOpenClassics(): Promise<Audiobook[]> {
    try {
      const res = await fetch(`http://localhost:3001/api/catalog/open-classics`);
      if (res.ok) {
        const data = await res.json();
        return data.products || [];
      }
    } catch {
      // Graceful fallback
    }
    return [];
  }

  /**
   * Resolve specific official Audible audio stream for an audiobook
   */
  async resolveOfficialAudio(book: Audiobook): Promise<string> {
    const rawUrl = book.sample_url;

    // If it's a samples.audible.com URL, proxy through stream relay for seamless scrubbing/seeking
    if (rawUrl && rawUrl.startsWith('https://samples.audible.com/')) {
      return `http://localhost:3001/api/stream?url=${encodeURIComponent(rawUrl)}`;
    }

    // If it's already an active local proxy stream, return directly
    if (rawUrl && rawUrl.startsWith('http://localhost:3001/api/stream')) {
      return rawUrl;
    }

    // If it's one of the dedicated 1-to-1 master wavs matching this specific book title
    if (rawUrl && rawUrl.startsWith('/audio/')) {
      const isHailMary = book.title.toLowerCase().includes('hail mary');
      // If someone has project-hail-mary.wav but the book is NOT Project Hail Mary, reject it and resolve online
      if (rawUrl.includes('project-hail-mary') && !isHailMary) {
        // Fall through to query official audio from ASL
      } else {
        return rawUrl;
      }
    }

    // Query local proxy to resolve specific official Audible sample
    try {
      const author = book.authors?.[0]?.name || '';
      const res = await fetch(`http://localhost:3001/api/audible/resolve-sample?title=${encodeURIComponent(book.title)}&author=${encodeURIComponent(author)}&asin=${book.asin}`);
      if (res.ok) {
        const data = await res.json();
        if (data.found && data.sample_url) {
          return data.sample_url;
        }
      }
    } catch {
      // Fallback
    }

    return rawUrl || 'https://samples.audible.com/bk/adbl/000620/bk_adbl_000620_sample.mp3';
  }
}

/**
 * Default singleton instance ready for import in UI components
 */
export const audibleService = new AudibleService();
export default audibleService;
