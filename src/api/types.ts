import { z } from 'zod';

/**
 * Author contributor schema and interface
 */
export const AuthorSchema = z.object({
  asin: z.string().optional(),
  name: z.string(),
  bio: z.string().optional(),
});
export type Author = z.infer<typeof AuthorSchema>;

/**
 * Narrator voice performer schema and interface
 */
export const NarratorSchema = z.object({
  asin: z.string().optional(),
  name: z.string(),
});
export type Narrator = z.infer<typeof NarratorSchema>;

/**
 * Rating breakdown distribution schema and interface
 */
export const RatingDistributionSchema = z.object({
  average_rating: z.number().min(0).max(5),
  display_average_rating: z.string().optional(),
  total_ratings: z.number().int().nonnegative(),
  num_five_star_ratings: z.number().int().nonnegative().optional(),
  num_four_star_ratings: z.number().int().nonnegative().optional(),
  num_three_star_ratings: z.number().int().nonnegative().optional(),
  num_two_star_ratings: z.number().int().nonnegative().optional(),
  num_one_star_ratings: z.number().int().nonnegative().optional(),
});
export type RatingDistribution = z.infer<typeof RatingDistributionSchema>;

export const RatingSchema = z.object({
  overall_distribution: RatingDistributionSchema,
  performance_distribution: z
    .object({
      average_rating: z.number().min(0).max(5),
      total_ratings: z.number().int().nonnegative(),
    })
    .optional(),
  story_distribution: z
    .object({
      average_rating: z.number().min(0).max(5),
      total_ratings: z.number().int().nonnegative(),
    })
    .optional(),
});
export type Rating = z.infer<typeof RatingSchema>;

/**
 * Pricing information schema and interface
 */
export const PriceSchema = z.object({
  list_price: z.object({
    amount: z.number(),
    currency_code: z.string().default('USD'),
  }),
  lowest_price: z
    .object({
      amount: z.number(),
      currency_code: z.string().default('USD'),
    })
    .optional(),
});
export type Price = z.infer<typeof PriceSchema>;

/**
 * Series relationship schema and interface
 */
export const SeriesSchema = z.object({
  title: z.string(),
  sequence: z.string().optional(),
});
export type Series = z.infer<typeof SeriesSchema>;

/**
 * Chapter boundary and timing schema and interface
 */
export const ChapterSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  start_offset_ms: z.number().int().nonnegative(),
  start_offset_sec: z.number().nonnegative(),
  length_ms: z.number().int().positive(),
});
export type Chapter = z.infer<typeof ChapterSchema>;

/**
 * Structural chapter metadata envelope schema and interface
 */
export const ChapterInfoSchema = z.object({
  is_accurate: z.boolean(),
  brand_intro_duration_ms: z.number().int().nonnegative().optional(),
  brand_outro_duration_ms: z.number().int().nonnegative().optional(),
  runtime_length_ms: z.number().int().positive(),
  runtime_length_sec: z.number().positive(),
  chapters: z.array(ChapterSchema),
});
export type ChapterInfo = z.infer<typeof ChapterInfoSchema>;

/**
 * User/Listener review schema and interface
 */
export const ReviewSchema = z.object({
  id: z.string(),
  asin: z.string(),
  author: z.string(),
  title: z.string(),
  rating: z.number().min(1).max(5),
  content: z.string(),
  date: z.string(),
  helpful_votes: z.number().int().nonnegative().optional(),
});
export type Review = z.infer<typeof ReviewSchema>;

/**
 * Audiobook product schema and interface
 */
export const AudiobookSchema = z.object({
  asin: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  authors: z.array(AuthorSchema),
  narrators: z.array(NarratorSchema),
  publisher_name: z.string(),
  release_date: z.string(),
  issue_date: z.string().optional(),
  runtime_length_min: z.number().positive(),
  format_type: z.enum(['unabridged', 'abridged']).default('unabridged'),
  language: z.string().default('english'),
  publisher_summary: z.string(),
  product_images: z.record(z.string(), z.string()).and(
    z.object({
      '500': z.string().url(),
      '1024': z.string().url().optional(),
    })
  ),
  rating: RatingSchema,
  sample_url: z.string().url(),
  price: PriceSchema.optional(),
  series: z.array(SeriesSchema).optional(),
  category_id: z.string().optional(),
  category_name: z.string().optional(),
  available_codecs: z.array(z.string()).optional(),
  is_in_wishlist: z.boolean().optional(),
  chapters: z.array(ChapterSchema).optional(),
  chapter_info: ChapterInfoSchema.optional(),
  reviews: z.array(ReviewSchema).optional(),
});
export type Audiobook = z.infer<typeof AudiobookSchema>;

/**
 * Category taxonomy tree schema and interface
 */
export const CategorySchema: z.ZodType<Category> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string().optional(),
    parent_id: z.string().nullable(),
    icon: z.string().optional(),
    children: z.array(CategorySchema).optional(),
  })
);

export interface Category {
  id: string;
  name: string;
  slug?: string;
  parent_id: string | null;
  icon?: string;
  children?: Category[];
}

/**
 * User library inventory entry schema and interface
 */
export const LibraryItemSchema = z.object({
  asin: z.string(),
  purchase_date: z.string(),
  status: z.enum(['Available', 'Processing', 'Archived']).default('Available'),
  origin_type: z
    .enum(['AudiblePurchase', 'AudibleMembership', 'Gift'])
    .default('AudiblePurchase'),
  is_downloaded: z.boolean().default(false),
  product: AudiobookSchema,
});
export type LibraryItem = z.infer<typeof LibraryItemSchema>;

/**
 * Whispersync listening progress schema and interface
 */
export const ListeningProgressSchema = z.object({
  asin: z.string(),
  position_ms: z.number().int().nonnegative(),
  chapter_index: z.number().int().nonnegative(),
  last_updated: z.string(),
  device_type: z.string().optional(),
  device_id: z.string().optional(),
});
export type ListeningProgress = z.infer<typeof ListeningProgressSchema>;

/**
 * User bookmark / note annotation schema and interface
 */
export const BookmarkSchema = z.object({
  id: z.string(),
  asin: z.string(),
  position_ms: z.number().int().nonnegative(),
  chapter_title: z.string(),
  note: z.string(),
  created_at: z.string(),
});
export type Bookmark = z.infer<typeof BookmarkSchema>;

/**
 * Catalog search query parameters schema and interface
 */
export const SearchCatalogParamsSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  sortBy: z
    .enum([
      'Relevance',
      'BestSellers',
      'AvgRating',
      '-ReleaseDate',
      'RuntimeLength',
      'TitleAZ',
    ])
    .optional(),
  page: z.number().int().min(0).optional().default(0),
  limit: z.number().int().min(1).max(50).optional().default(20),
});
export type SearchCatalogParams = z.infer<typeof SearchCatalogParamsSchema>;

/**
 * Catalog search response result schema and interface
 */
export const SearchResultSchema = z.object({
  products: z.array(AudiobookSchema),
  total_results: z.number().int().nonnegative(),
  page: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  response_groups: z.array(z.string()).optional(),
});
export type SearchResult = z.infer<typeof SearchResultSchema>;
