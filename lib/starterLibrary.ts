import { MusicPiece } from "@/types";

/**
 * Starter Violin Library - Hard-bound to local PDF assets
 * Each PDF file must exist in /public/sheet-music/
 * These are guaranteed assets, never prompt for upload
 */
export const STARTER_VIOLIN_LIBRARY: MusicPiece[] = [
  {
    id: "starter-1",
    title: "Mary Had a Little Lamb",
    composer: "Traditional",
    type: "public_domain",
    fileUrl: "/sheet-music/mary-had-a-little-lamb.pdf",
    difficulty: 1, // ⭐
  },
  {
    id: "starter-2",
    title: "Hot Cross Buns",
    composer: "Traditional",
    type: "public_domain",
    fileUrl: "/sheet-music/hot-cross-buns.pdf",
    difficulty: 1, // ⭐
  },
  {
    id: "starter-3",
    title: "Twinkle, Twinkle Little Star",
    composer: "Traditional",
    type: "public_domain",
    fileUrl: "/sheet-music/twinkle-twinkle-little-star.pdf",
    difficulty: 1, // ⭐
  },
  {
    id: "starter-4",
    title: "Lightly Row",
    composer: "Traditional",
    type: "public_domain",
    fileUrl: "/sheet-music/lightly-row.pdf",
    difficulty: 2, // ⭐⭐
  },
  {
    id: "starter-5",
    title: "Go Tell Aunt Rhody",
    composer: "Traditional",
    type: "public_domain",
    fileUrl: "/sheet-music/go-tell-aunt-rhody.pdf",
    difficulty: 2, // ⭐⭐
  },
  {
    id: "starter-6",
    title: "Ode to Joy",
    composer: "Ludwig van Beethoven",
    type: "public_domain",
    fileUrl: "/sheet-music/ode-to-joy.pdf",
    difficulty: 2, // ⭐⭐
  },
  {
    id: "starter-7",
    title: "Long, Long Ago",
    composer: "Traditional",
    type: "public_domain",
    fileUrl: "/sheet-music/long-long-ago.pdf",
    difficulty: 2, // ⭐⭐
  },
  {
    id: "starter-8",
    title: "Minuet in G",
    composer: "J.S. Bach",
    type: "public_domain",
    fileUrl: "/sheet-music/minuet-in-g.pdf",
    difficulty: 3, // ⭐⭐⭐
  },
  {
    id: "starter-9",
    title: "Allegretto",
    composer: "Traditional",
    type: "public_domain",
    fileUrl: "/sheet-music/allegretto.pdf",
    difficulty: 2, // ⭐⭐
  },
  {
    id: "starter-10",
    title: "Song of the Wind",
    composer: "Traditional",
    type: "public_domain",
    fileUrl: "/sheet-music/song-of-the-wind.pdf",
    difficulty: 3, // ⭐⭐⭐
  },
];

/**
 * Get starter library - always returns all songs
 * Starter songs are hard-bound to their PDFs and should never prompt for upload
 */
export function getStarterLibrary(): MusicPiece[] {
  return STARTER_VIOLIN_LIBRARY;
}

/**
 * Check if a piece is a starter song (hard-bound to bundled PDF)
 */
export function isStarterSong(piece: MusicPiece): boolean {
  return piece.type === "public_domain" && STARTER_VIOLIN_LIBRARY.some(s => s.id === piece.id);
}

