"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square, Trash2 } from "lucide-react";

const MAX_MEDIA_FILES = 3;
const MAX_VOICE_SECONDS = 60;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

export type SosMediaPayload = {
  mediaUrls: string[];
  voiceNoteData: string | null;
};

type SosMediaCaptureProps = {
  onChange: (payload: SosMediaPayload) => void;
};

type MediaPreview = {
  id: string;
  name: string;
  dataUrl: string;
  isVideo: boolean;
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("تعذر قراءة الملف"));
    reader.readAsDataURL(file);
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("تعذر قراءة التسجيل"));
    reader.readAsDataURL(blob);
  });
}

export default function SosMediaCapture({ onChange }: SosMediaCaptureProps) {
  const [mediaPreviews, setMediaPreviews] = useState<MediaPreview[]>([]);
  const [voiceNoteUrl, setVoiceNoteUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    onChangeRef.current({
      mediaUrls: mediaPreviews.map((item) => item.dataUrl),
      voiceNoteData: voiceNoteUrl,
    });
  }, [mediaPreviews, voiceNoteUrl]);

  useEffect(() => {
    return () => {
      stopRecording();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function stopRecordingTimer() {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }

  function stopRecording() {
    stopRecordingTimer();

    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);
  }

  async function handleMediaChange(event: React.ChangeEvent<HTMLInputElement>) {
    setMediaError(null);
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    const remainingSlots = MAX_MEDIA_FILES - mediaPreviews.length;

    if (remainingSlots <= 0) {
      setMediaError(`الحد الأقصى ${MAX_MEDIA_FILES} ملفات.`);
      event.target.value = "";
      return;
    }

    const selected = files.slice(0, remainingSlots);
    const nextPreviews: MediaPreview[] = [];

    for (const file of selected) {
      if (file.size > MAX_FILE_BYTES) {
        setMediaError("حجم الملف كبير جداً (الحد 5 ميغابايت لكل ملف).");
        continue;
      }

      try {
        const dataUrl = await fileToDataUrl(file);
        nextPreviews.push({
          id: `${file.name}-${file.lastModified}`,
          name: file.name,
          dataUrl,
          isVideo: file.type.startsWith("video/"),
        });
      } catch {
        setMediaError("تعذر معالجة أحد الملفات.");
      }
    }

    setMediaPreviews((current) => [...current, ...nextPreviews]);
    event.target.value = "";
  }

  function removeMedia(id: string) {
    setMediaPreviews((current) => current.filter((item) => item.id !== id));
  }

  async function startRecording() {
    setMediaError(null);

    if (voiceNoteUrl) {
      setMediaError("احذف التسجيل الحالي قبل تسجيل جديد.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        try {
          const dataUrl = await blobToDataUrl(blob);
          setVoiceNoteUrl(dataUrl);
        } catch {
          setMediaError("تعذر حفظ الرسالة الصوتية.");
        }

        setRecordingSeconds(0);
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((current) => {
          if (current + 1 >= MAX_VOICE_SECONDS) {
            stopRecording();
            return MAX_VOICE_SECONDS;
          }
          return current + 1;
        });
      }, 1000);
    } catch {
      setMediaError("تعذر الوصول للميكروفون — تحقق من الأذونات.");
    }
  }

  function handleRecordPress() {
    if (isRecording) {
      stopRecording();
      return;
    }

    void startRecording();
  }

  function removeVoiceNote() {
    setVoiceNoteUrl(null);
    setRecordingSeconds(0);
  }

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <h3 className="text-sm font-bold text-zinc-900">
          📸 إضافة صور أو فيديو للحادثة
        </h3>
        <p className="text-xs text-zinc-500">
          حتى {MAX_MEDIA_FILES} ملفات (صور أو فيديو)
        </p>

        <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4 text-sm font-medium text-zinc-700 hover:border-red-300 hover:bg-red-50/40">
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleMediaChange}
            disabled={mediaPreviews.length >= MAX_MEDIA_FILES}
          />
          اختر ملفات من الجهاز
        </label>

        {mediaPreviews.length > 0 ? (
          <ul className="grid grid-cols-3 gap-2">
            {mediaPreviews.map((item) => (
              <li
                key={item.id}
                className="relative overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100"
              >
                {item.isVideo ? (
                  <video
                    src={item.dataUrl}
                    className="h-20 w-full object-cover"
                    controls
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.dataUrl}
                    alt={item.name}
                    className="h-20 w-full object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeMedia(item.id)}
                  className="absolute left-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                  aria-label="حذف الملف"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-bold text-zinc-900">
          🎙️ تسجيل رسالة صوتية سريعة
        </h3>
        <p className="text-xs text-zinc-500">
          اضغط للتسجيل (حتى {MAX_VOICE_SECONDS} ثانية)
        </p>

        <button
          type="button"
          onClick={handleRecordPress}
          className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
            isRecording
              ? "border-red-600 bg-red-600 text-white"
              : "border-zinc-300 bg-white text-zinc-800 hover:border-red-300"
          }`}
        >
          {isRecording ? (
            <>
              <Square className="h-4 w-4" />
              إيقاف التسجيل ({recordingSeconds}s)
            </>
          ) : (
            <>
              <Mic className="h-4 w-4" />
              تسجيل رسالة صوتية
            </>
          )}
        </button>

        {isRecording ? (
          <p className="flex items-center gap-2 text-xs text-red-600">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            جاري التسجيل...
          </p>
        ) : null}

        {voiceNoteUrl ? (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <audio src={voiceNoteUrl} controls className="w-full" />
            <button
              type="button"
              onClick={removeVoiceNote}
              className="mt-2 flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-3.5 w-3.5" />
              حذف التسجيل
            </button>
          </div>
        ) : null}
      </section>

      {mediaError ? (
        <p className="text-xs text-red-600">{mediaError}</p>
      ) : null}
    </div>
  );
}
