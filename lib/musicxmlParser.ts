import { MusicXMLNotation, MusicXMLNote, MusicXMLMeasure, MusicXMLSystem } from "@/types/musicxml";

/**
 * Parse MusicXML file and extract structured notation data
 * This is the single source of truth for all timing, pitch, and layout
 */
export async function parseMusicXML(xmlContent: string): Promise<MusicXMLNotation> {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, "text/xml");
  
  // Check for parsing errors
  const parserError = xmlDoc.querySelector("parsererror");
  if (parserError) {
    throw new Error(`MusicXML parsing error: ${parserError.textContent}`);
  }

  // Extract metadata
  const workTitle = xmlDoc.querySelector("work > work-title")?.textContent || "Untitled";
  const composer = xmlDoc.querySelector("identification > creator[type='composer']")?.textContent;
  
  // Extract time signature (default to 4/4)
  const timeElement = xmlDoc.querySelector("attributes > time");
  const numerator = parseInt(timeElement?.querySelector("beats")?.textContent || "4");
  const denominator = parseInt(timeElement?.querySelector("beat-type")?.textContent || "4");
  
  // Extract key signature
  const keyElement = xmlDoc.querySelector("attributes > key");
  const fifths = keyElement ? parseInt(keyElement.querySelector("fifths")?.textContent || "0") : 0;
  const mode = keyElement?.querySelector("mode")?.textContent as "major" | "minor" | undefined;
  
  // Extract tempo (default to 120 BPM)
  const tempoElement = xmlDoc.querySelector("sound[tempo]");
  const tempo = tempoElement ? parseFloat(tempoElement.getAttribute("tempo") || "120") : 120;
  
  // Extract all measures
  const measureElements = xmlDoc.querySelectorAll("part > measure");
  const measures: MusicXMLMeasure[] = [];
  const allNotes: MusicXMLNote[] = [];
  let currentBeat = 0;
  let systemIndex = 0;
  let measuresPerSystem = 4; // Default: 4 measures per system
  
  measureElements.forEach((measureEl, measureIdx) => {
    const measureNumber = parseInt(measureEl.getAttribute("number") || String(measureIdx + 1));
    const measureStartBeat = currentBeat;
    
    // Check for system break (new system starts)
    const printElement = measureEl.querySelector("print");
    if (printElement?.getAttribute("new-system") === "yes" && measureIdx > 0) {
      systemIndex++;
    }
    
      // Get divisions for this measure (check current measure first, then previous)
      let divisions = parseFloat(measureEl.querySelector("attributes > divisions")?.textContent || "1");
      if (isNaN(divisions) && measureIdx > 0) {
        const prevMeasure = measureElements[measureIdx - 1];
        divisions = parseFloat(prevMeasure.querySelector("attributes > divisions")?.textContent || "1");
      }
      
      // Extract notes from this measure
      const noteElements = measureEl.querySelectorAll("note");
      const measureNotes: MusicXMLNote[] = [];
      let measureDuration = 0;
      let currentBeatInMeasure = 0;
      
      noteElements.forEach((noteEl, noteIdx) => {
        // Extract duration
        const duration = parseFloat(noteEl.querySelector("duration")?.textContent || "0");
        const durationInBeats = duration / divisions;
        
        // Check for dot (dotted note)
        const dot = noteEl.querySelector("dot");
        const durationWithDot = dot ? durationInBeats * 1.5 : durationInBeats;
        
        // Check if this is a rest
        const rest = noteEl.querySelector("rest");
        if (rest) {
          // Handle rest - contributes to timing but not pitch
          measureDuration += durationWithDot;
          currentBeatInMeasure += durationWithDot;
          currentBeat += durationWithDot;
          return; // Don't add rest to notes list
        }
        
        // Extract pitch
        const pitchEl = noteEl.querySelector("pitch");
        if (!pitchEl) {
          // No pitch element - skip (might be grace note or continuation)
          measureDuration += durationWithDot;
          currentBeatInMeasure += durationWithDot;
          currentBeat += durationWithDot;
          return;
        }
        
        const step = pitchEl.querySelector("step")?.textContent || "C";
        const octave = parseInt(pitchEl.querySelector("octave")?.textContent || "4");
        const alter = pitchEl.querySelector("alter")?.textContent;
        
        // Build pitch string
        let pitch = step;
        if (alter) {
          const alterNum = parseInt(alter);
          if (alterNum === 1) pitch = step + "#";
          else if (alterNum === -1) pitch = step + "b";
          else if (alterNum === 2) pitch = step + "##";
          else if (alterNum === -2) pitch = step + "bb";
        }
        pitch += octave;
        
        // Calculate MIDI number
        const midiNumber = pitchToMidi(pitch);
        
        // Check if this is a chord note (same timing as previous note)
        const chord = noteEl.querySelector("chord");
        const noteBeatPosition = chord && measureNotes.length > 0
          ? measureNotes[measureNotes.length - 1].beatPosition // Same beat as previous note
          : currentBeat; // New beat position
        
        // Extract staff (for multi-staff pieces)
        const staff = parseInt(noteEl.querySelector("staff")?.textContent || "1");
        const voice = parseInt(noteEl.querySelector("voice")?.textContent || "1");
        
        // Extract stem direction
        const stem = noteEl.querySelector("stem")?.textContent;
        const stemDirection = stem === "up" ? "up" : stem === "down" ? "down" : undefined;
        
        // Extract accidental
        const accidentalEl = noteEl.querySelector("accidental");
        const accidental = accidentalEl?.textContent as "sharp" | "flat" | "natural" | "double-sharp" | "double-flat" | undefined;
        
        // Extract tie
        const tieEl = noteEl.querySelector("tie");
        const tie = tieEl?.getAttribute("type") as "start" | "stop" | "continue" | undefined;
        
        // Extract slur
        const slurEl = noteEl.querySelector("slur");
        const slur = slurEl?.getAttribute("type") as "start" | "stop" | undefined;
        
        const note: MusicXMLNote = {
          id: `note-${measureNumber}-${noteIdx}`,
          pitch,
          midiNumber,
          duration: durationWithDot,
          beatPosition: noteBeatPosition,
          measureIndex: measureNumber,
          staffIndex: systemIndex,
          voice,
          stemDirection,
          accidental,
          tie,
          slur,
        };
        
        measureNotes.push(note);
        allNotes.push(note);
        
        // Only advance beat if this is not a chord note
        if (!chord) {
          measureDuration += durationWithDot;
          currentBeatInMeasure += durationWithDot;
          currentBeat += durationWithDot;
        }
    });
    
    measures.push({
      measureNumber,
      systemIndex,
      startBeat: measureStartBeat,
      duration: measureDuration || numerator, // Fallback to time signature numerator
      timeSignature: { numerator, denominator },
      notes: measureNotes,
    });
  });
  
  // Group measures into systems
  const systems: MusicXMLSystem[] = [];
  let currentSystem: MusicXMLSystem | null = null;
  
  measures.forEach((measure) => {
    if (!currentSystem || currentSystem.systemIndex !== measure.systemIndex) {
      if (currentSystem) {
        systems.push(currentSystem);
      }
      currentSystem = {
        systemIndex: measure.systemIndex,
        measures: [measure.measureNumber],
        startBeat: measure.startBeat,
        endBeat: measure.startBeat + measure.duration,
      };
    } else {
      currentSystem.measures.push(measure.measureNumber);
      currentSystem.endBeat = measure.startBeat + measure.duration;
    }
  });
  
  if (currentSystem) {
    systems.push(currentSystem);
  }
  
  return {
    title: workTitle,
    composer,
    timeSignature: { numerator, denominator },
    keySignature: fifths !== 0 ? { fifths, mode } : undefined,
    tempo,
    measures,
    systems,
    notes: allNotes,
    totalBeats: currentBeat,
  };
}

/**
 * Convert pitch string to MIDI note number
 */
function pitchToMidi(pitch: string): number {
  const match = pitch.match(/^([A-G])([#b]*)(\d+)$/);
  if (!match) return 60; // Default to C4
  
  const [, step, accidentals, octave] = match;
  const stepToSemitones: { [key: string]: number } = {
    C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
  };
  
  let semitones = stepToSemitones[step];
  semitones += (accidentals.match(/#/g)?.length || 0);
  semitones -= (accidentals.match(/b/g)?.length || 0);
  
  return 12 + (parseInt(octave) * 12) + semitones;
}

/**
 * Load MusicXML file from URL or path
 */
export async function loadMusicXML(url: string): Promise<MusicXMLNotation> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load MusicXML: ${response.statusText}`);
  }
  const xmlContent = await response.text();
  return parseMusicXML(xmlContent);
}

/**
 * Convert MusicXML notation to the internal notationData format
 * This bridges the gap between MusicXML and the existing system
 */
export function musicXMLToNotationData(musicXML: MusicXMLNotation): NonNullable<import("@/types").MusicPiece["notationData"]> {
  return {
    timeSignature: musicXML.timeSignature,
    measures: musicXML.measures.map((m) => ({
      measureNumber: m.measureNumber,
      systemIndex: m.systemIndex,
      startBeat: m.startBeat,
      duration: m.duration,
    })),
    totalBeats: musicXML.totalBeats,
  };
}
