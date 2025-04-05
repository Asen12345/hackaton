import { RefObject } from 'react';

export class VoiceRecorder {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private timerRef: NodeJS.Timeout | null = null;
  private onTimeUpdate: (seconds: number) => void;
  private onRecordingComplete: (blob: Blob) => void;
  private currentSeconds: number = 0;
  private stopPromise: Promise<Blob> | null = null;
  private stopResolve: ((blob: Blob) => void) | null = null;

  constructor(
    onTimeUpdate: (seconds: number) => void,
    onRecordingComplete: (blob: Blob) => void
  ) {
    this.onTimeUpdate = onTimeUpdate;
    this.onRecordingComplete = onRecordingComplete;
  }

  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaStream = stream;
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      
      this.mediaRecorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) {
          this.chunks.push(e.data);
          console.log('Получен чанк данных размером:', e.data.size);
        }
      };

      this.timerRef = setInterval(() => {
        this.currentSeconds += 1;
        this.onTimeUpdate(this.currentSeconds);
      }, 1000);

      this.mediaRecorder.onstop = () => {
        const recordedBlob = new Blob(this.chunks, { type: 'audio/webm' });
        console.log('Размер записанного аудио:', recordedBlob.size);
        this.onRecordingComplete(recordedBlob);
        if (this.stopResolve) {
          this.stopResolve(recordedBlob);
        }
        this.chunks = [];
        if (this.timerRef) {
          clearInterval(this.timerRef);
        }
      };

      this.mediaRecorder.start();
      return true;
    } catch (error) {
      console.error('Ошибка при записи:', error);
      return false;
    }
  }

  async stopRecording(): Promise<Blob | null> {
    if (this.mediaRecorder && this.mediaStream) {
      this.stopPromise = new Promise<Blob>((resolve) => {
        this.stopResolve = resolve;
      });
      this.mediaRecorder.stop();
      this.mediaStream.getTracks().forEach(track => track.stop());
      return this.stopPromise;
    }
    return null;
  }

  cleanup() {
    if (this.timerRef) {
      clearInterval(this.timerRef);
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }
  }
} 