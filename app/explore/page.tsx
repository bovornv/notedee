"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { usePracticeStore } from "@/store/practiceStore";
import { useLanguageStore } from "@/store/languageStore";
import { MusicPiece } from "@/types";
import { Search, Music } from "lucide-react";
import { t } from "@/lib/translations";

// Public domain pieces
const PUBLIC_PIECES: MusicPiece[] = [
  {
    id: "1",
    title: "Twinkle Twinkle Little Star",
    composer: "Traditional",
    type: "public_domain",
    fileUrl: "/samples/twinkle.pdf",
  },
  {
    id: "2",
    title: "Mary Had a Little Lamb",
    composer: "Traditional",
    type: "public_domain",
    fileUrl: "/samples/mary.pdf",
  },
  {
    id: "3",
    title: "Happy Birthday",
    composer: "Traditional",
    type: "public_domain",
    fileUrl: "/samples/happy-birthday.pdf",
  },
  {
    id: "4",
    title: "Row Row Row Your Boat",
    composer: "Traditional",
    type: "public_domain",
    fileUrl: "/samples/row-boat.pdf",
  },
  {
    id: "5",
    title: "London Bridge",
    composer: "Traditional",
    type: "public_domain",
    fileUrl: "/samples/london-bridge.pdf",
  },
  {
    id: "6",
    title: "Yankee Doodle",
    composer: "Traditional",
    type: "public_domain",
    fileUrl: "/samples/yankee-doodle.pdf",
  },
];

export default function ExplorePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { language, initialize } = useLanguageStore();
  const { setSelectedPiece, resetSteps2And3 } = usePracticeStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredPieces, setFilteredPieces] = useState(PUBLIC_PIECES);

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
      setFilteredPieces(PUBLIC_PIECES);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredPieces(
        PUBLIC_PIECES.filter(
          (piece) =>
            piece.title.toLowerCase().includes(query) ||
            piece.composer?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery]);

  const handleSelectPiece = (piece: MusicPiece) => {
    resetSteps2And3();
    setSelectedPiece(piece);
    router.push("/main");
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
            placeholder={language === "en" ? "Search songs..." : "ค้นหาเพลง..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-foreground"
          />
        </div>
      </div>

      {/* Song List */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredPieces.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted">
            {language === "en" ? "No songs found" : "ไม่พบเพลงที่ค้นหา"}
          </div>
        ) : (
          filteredPieces.map((piece) => (
            <button
              key={piece.id}
              onClick={() => handleSelectPiece(piece)}
              className="flex items-start gap-4 rounded-lg border border-border bg-background p-4 text-left transition-colors hover:bg-accent"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded bg-accent">
                <Music className="h-6 w-6 text-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="mb-1 font-semibold">{piece.title}</h3>
                {piece.composer && (
                  <p className="text-sm text-muted">{piece.composer}</p>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
