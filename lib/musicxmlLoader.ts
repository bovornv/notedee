import { MusicPiece } from "@/types";
import { MusicXMLNotation } from "@/types/musicxml";
import { loadMusicXML, musicXMLToNotationData } from "./musicxmlParser";

/**
 * Load MusicXML data for a piece
 * This is the single source of truth for all timing, pitch, and layout
 */
export async function loadPieceMusicXML(piece: MusicPiece | null): Promise<MusicXMLNotation | null> {
  if (!piece || !piece.musicXMLUrl) {
    return null;
  }

  try {
    const musicXML = await loadMusicXML(piece.musicXMLUrl);
    return musicXML;
  } catch (error) {
    console.error(`Failed to load MusicXML for ${piece.title}:`, error);
    return null;
  }
}

/**
 * Check if a piece has MusicXML support (analyzable)
 */
export function hasMusicXMLSupport(piece: MusicPiece | null): boolean {
  return piece?.musicXMLUrl !== undefined;
}

/**
 * Load and convert MusicXML to notationData format
 * Used for backward compatibility with existing code
 */
export async function loadPieceNotationData(piece: MusicPiece | null): Promise<NonNullable<MusicPiece["notationData"]> | null> {
  const musicXML = await loadPieceMusicXML(piece);
  if (!musicXML) {
    return null;
  }
  return musicXMLToNotationData(musicXML);
}
