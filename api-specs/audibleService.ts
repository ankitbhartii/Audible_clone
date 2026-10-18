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
  LIBRARY: 'audible_web_clone_library_v1',
  PROGRESS: 'audible_web_clone_progress_v1',
  BOOKMARKS: 'audible_web_clone_bookmarks_v1',
} as const;

/**
 * Storage adapter with safe in-memory fallback for SSR and non-browser environments.
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
    if (this.isLocalStorageAvailable()) {
      return window.localStorage.getItem(key);
    }
    return this.memoryStore.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.isLocalStorageAvailable()) {
      window.localStorage.setItem(key, value);
    }
    this.memoryStore.set(key, value);
  }

  removeItem(key: string): void {
    if (this.isLocalStorageAvailable()) {
      window.localStorage.removeItem(key);
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
    const existing = this.storage.getItem(STORAGE_KEYS.LIBRARY);
    if (!existing) {
      this.storage.setItem(
        STORAGE_KEYS.LIBRARY,
        JSON.stringify(INITIAL_LIBRARY_ITEMS)
      );
    }
  }

  /**
   * Search and filter the audiobook catalog
   */
  async searchCatalog(params: {
    query?: string;
    category?: string;
    sortBy?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<SearchResult> {
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
  async getAudiobook(asin: string): Promise<Audiobook | null> {
    const book = this.catalog.find((b) => b.asin === asin);
    if (!book) {
      // Check in library
      const library = await this.getUserLibrary();
      const libItem = library.find((i) => i.asin === asin);
      return libItem ? libItem.product : null;
    }
    return book;
  }

  /**
   * Get category taxonomy tree
   */
  async getCategories(): Promise<Category[]> {
    return this.categories;
  }

  /**
   * Get audiobooks in user's library
   */
  async getUserLibrary(): Promise<LibraryItem[]> {
    const stored = this.storage.getItem(STORAGE_KEYS.LIBRARY);
    if (!stored) {
      return [...INITIAL_LIBRARY_ITEMS];
    }
    try {
      return JSON.parse(stored) as LibraryItem[];
    } catch {
      return [...INITIAL_LIBRARY_ITEMS];
    }
  }

  /**
   * Add an audiobook to user library
   */
  async addToLibrary(asin: string): Promise<LibraryItem> {
    const library = await this.getUserLibrary();
    const existing = library.find((item) => item.asin === asin);
    if (existing) {
      return existing;
    }

    const book = await this.getAudiobook(asin);
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
  async removeFromLibrary(asin: string): Promise<boolean> {
    const library = await this.getUserLibrary();
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
  async getListeningProgress(asin: string): Promise<ListeningProgress | null> {
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
  async saveListeningProgress(
    asin: string,
    progress: { positionMs: number; chapterIndex: number }
  ): Promise<ListeningProgress> {
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
  async getBookmarks(asin: string): Promise<Bookmark[]> {
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
  async addBookmark(
    asin: string,
    bookmark: { positionMs: number; note: string; chapterTitle: string }
  ): Promise<Bookmark> {
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
}

/**
 * Default singleton instance ready for import in UI components
 */
export const audibleService = new AudibleService();
export default audibleService;
