export type MediaType = "movie" | "book" | "tv";

export interface Media {
  id: string;
  type: MediaType;
  title: string;
  description: string | null;
  drive_url: string;
  year: number | null;
  age_rating: string | null;
  genre: string | null;
  cover_url: string | null;
}
