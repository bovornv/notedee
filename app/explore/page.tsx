"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { usePracticeStore } from "@/store/practiceStore";
import { useLanguageStore } from "@/store/languageStore";
import { MusicPiece } from "@/types";
import { Search, Music, Star, Upload } from "lucide-react";
import { t } from "@/lib/translations";
import { getStarterLibrary, isStarterSong } from "@/lib/starterLibrary";

export default function ExplorePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { language, initialize } = useLanguageStore();
  const { setSelectedPiece, resetSteps2And3 } = usePracticeStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [availablePieces] = useState<MusicPiece[]>(getStarterLibrary());
  const [filteredPieces, setFilteredPieces] = useState<MusicPiece[]>(getStarterLibrary());

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredPieces(availablePieces);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredPieces(
        availablePieces.filter(
          (piece) =>
            piece.title.toLowerCase().includes(query) ||
            piece.composer?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, availablePieces]);

  const handleSelectPiece = (piece: MusicPiece) => {
    // Starter songs are hard-bound to their PDFs - load immediately, no verification
    // If PDF is missing, SheetMusicViewer will handle it gracefully
    resetSteps2And3();
    setSelectedPiece(piece);
    router.push("/main");
  };

  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === "application/pdf" || file.type.startsWith("image/"))) {
      const fileUrl = URL.createObjectURL(file);
      const uploadedPiece: MusicPiece = {
        id: `upload-${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, ""),
        composer: "User Upload",
        type: "user_upload",
        fileUrl,
      };
      resetSteps2And3();
      setSelectedPiece(uploadedPiece);
      router.push("/main");
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="mb-8 text-2xl font-semibold">{t("step1.explore", language)}</h1>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder={t("explore.search_placeholder", language)}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-foreground"
          />
        </div>
      </div>

      {/* Upload Your Own Sheet Music - Always Visible */}
      <div className="mb-6">
        <label className="flex cursor-pointer items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-background px-6 py-4 transition-colors hover:bg-accent">
          <Upload className="h-5 w-5 text-foreground" />
          <span className="font-medium">
            {t("practice.upload", language)} ({t("practice.upload_desc", language)})
          </span>
          <input
            type="file"
            accept=".pdf,image/*"
            onChange={handleUploadFile}
            className="hidden"
          />
        </label>
      </div>

      {/* Song List */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredPieces.length === 0 ? (
          <div className="col-span-full rounded-lg border border-border bg-background p-8 text-center">
            <Music className="mx-auto mb-4 h-12 w-12 text-muted" />
            <h3 className="mb-2 text-lg font-semibold">
              {t("explore.no_songs", language)}
            </h3>
            <p className="mb-4 text-sm text-muted">
              {t("explore.no_songs_desc", language)}
            </p>
          </div>
        ) : (
          filteredPieces.map((piece) => (
            <div
              key={piece.id}
              className="flex flex-col rounded-lg border border-border bg-background p-4 transition-colors hover:bg-accent"
            >
              <div className="mb-3 flex items-start gap-3">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded bg-accent">
                  <Music className="h-6 w-6 text-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="mb-1 font-semibold">{piece.title}</h3>
                  {piece.composer && (
                    <p className="mb-2 text-sm text-muted">{piece.composer}</p>
                  )}
                  {/* Difficulty Stars */}
                  {piece.difficulty && (
                    <div className="flex gap-0.5">
                      {[1, 2, 3].map((level) => (
                        <Star
                          key={level}
                          className={`h-4 w-4 ${
                            level <= piece.difficulty!
                              ? "fill-warning text-warning"
                              : "text-muted"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* Open Button */}
              <button
                onClick={() => handleSelectPiece(piece)}
                className="mt-auto w-full rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
              >
                {t("explore.open", language)}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
