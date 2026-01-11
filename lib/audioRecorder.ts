export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private dataArray: Float32Array | null = null;
  private onAudioChunkCallback: ((audioBuffer: AudioBuffer) => void) | null = null;

  async start(onAudioChunk?: (audioBuffer: AudioBuffer) => void): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      this.stream = stream;
      this.audioChunks = [];
      this.onAudioChunkCallback = onAudioChunk || null;

      // Set up AudioContext for real-time processing (if callback provided)
      if (onAudioChunk) {
        this.audioContext = new AudioContext({ sampleRate: 44100 });
        const source = this.audioContext.createMediaStreamSource(stream);
        this.analyserNode = this.audioContext.createAnalyser();
        this.analyserNode.fftSize = 2048;
        this.analyserNode.smoothingTimeConstant = 0.8;
        source.connect(this.analyserNode);
        this.dataArray = new Float32Array(this.analyserNode.fftSize);
      }

      // Try different mime types for better browser compatibility
      let options: MediaRecorderOptions = {};
      const types = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ];

      for (const mimeType of types) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          options.mimeType = mimeType;
          break;
        }
      }

      this.mediaRecorder = new MediaRecorder(stream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(100); // Collect data every 100ms
    } catch (error) {
      console.error("Error starting audio recording:", error);
      throw new Error("Failed to access microphone");
    }
  }

  // Get audio buffer for a specific time range (for measure-level analysis)
  async getAudioBufferForRange(startTime: number, endTime: number): Promise<AudioBuffer | null> {
    try {
      // Get all chunks recorded so far
      const allChunks = [...this.audioChunks];
      if (allChunks.length === 0) return null;

      // Create a new AudioContext to decode the recorded chunks
      const tempContext = new AudioContext({ sampleRate: 44100 });
      
      const audioBlob = new Blob(allChunks, {
        type: this.mediaRecorder?.mimeType || "audio/webm",
      });

      const arrayBuffer = await audioBlob.arrayBuffer();
      const fullBuffer = await tempContext.decodeAudioData(arrayBuffer);

      // Extract the time range
      const startSample = Math.floor(startTime * fullBuffer.sampleRate);
      const endSample = Math.floor(endTime * fullBuffer.sampleRate);
      const length = endSample - startSample;

      if (length <= 0 || startSample >= fullBuffer.length || startSample < 0) {
        tempContext.close();
        return null;
      }

      const channelData = fullBuffer.getChannelData(0);
      const extractedData = channelData.slice(startSample, Math.min(endSample, channelData.length));

      // Create new AudioBuffer with extracted data
      const newBuffer = tempContext.createBuffer(
        1,
        extractedData.length,
        fullBuffer.sampleRate
      );
      newBuffer.copyToChannel(extractedData, 0);

      tempContext.close();
      return newBuffer;
    } catch (error) {
      console.error("Error extracting audio range:", error);
      return null;
    }
  }

  stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
        reject(new Error("Recorder is not active"));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, {
          type: this.mediaRecorder?.mimeType || "audio/webm",
        });
        this.cleanup();
        resolve(audioBlob);
      };

      this.mediaRecorder.onerror = (event) => {
        reject(new Error("Recording error occurred"));
      };

      this.mediaRecorder.stop();
    });
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyserNode = null;
    this.dataArray = null;
    this.onAudioChunkCallback = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  async getAudioBuffer(blob: Blob): Promise<AudioBuffer> {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const audioContext = new AudioContext({ sampleRate: 44100 });
      return await audioContext.decodeAudioData(arrayBuffer);
    } catch (error) {
      console.error("Error decoding audio:", error);
      throw new Error("Failed to process audio data");
    }
  }
}
