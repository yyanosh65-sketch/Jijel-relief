"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";

const MAX_MEDIA_FILES = 8;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

type MediaPreview = {
  id: string;
  name: string;
  dataUrl: string;
  isVideo: boolean;
};

type FieldReportMediaUploadProps = {
  value: string[];
  onChange: (urls: string[]) => void;
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("تعذر قراءة الملف"));
    reader.readAsDataURL(file);
  });
}

export default function FieldReportMediaUpload({
  value,
  onChange,
}: FieldReportMediaUploadProps) {
  const [previews, setPreviews] = useState<MediaPreview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    onChangeRef.current(previews.map((item) => item.dataUrl));
  }, [previews]);

  useEffect(() => {
    if (value.length === 0 && previews.length > 0) {
      setPreviews([]);
    }
  }, [previews.length, value.length]);

  const processFiles = useCallback(async (files: File[]) => {
    setError(null);

    if (files.length === 0) {
      return;
    }

    const remainingSlots = MAX_MEDIA_FILES - previews.length;

    if (remainingSlots <= 0) {
      setError(`الحد الأقصى ${MAX_MEDIA_FILES} ملفات.`);
      return;
    }

    const selected = files.slice(0, remainingSlots);
    const nextPreviews: MediaPreview[] = [];

    for (const file of selected) {
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        setError("يُسمح بالصور والفيديوهات فقط.");
        continue;
      }

      if (file.size > MAX_FILE_BYTES) {
        setError("حجم الملف كبير جداً (الحد 5 ميغابايت لكل ملف).");
        continue;
      }

      try {
        const dataUrl = await fileToDataUrl(file);
        nextPreviews.push({
          id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
          name: file.name,
          dataUrl,
          isVideo: file.type.startsWith("video/"),
        });
      } catch {
        setError("تعذر معالجة أحد الملفات.");
      }
    }

    if (nextPreviews.length > 0) {
      setPreviews((current) => [...current, ...nextPreviews]);
    }
  }, [previews.length]);

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    void processFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    void processFiles(Array.from(event.dataTransfer.files ?? []));
  }

  function removePreview(id: string) {
    setPreviews((current) => current.filter((item) => item.id !== id));
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
          isDragging
            ? "border-emerald-500 bg-emerald-50"
            : "border-slate-300 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50/40"
        }`}
      >
        <Upload className="mb-2 h-6 w-6 text-emerald-700" />
        <p className="text-sm font-semibold text-slate-800">
          اسحب الصور/الفيديوهات هنا أو انقر للاختيار
        </p>
        <p className="mt-1 text-xs text-slate-500">
          حتى {MAX_MEDIA_FILES} ملفات — معاينة فورية
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={handleInputChange}
          disabled={previews.length >= MAX_MEDIA_FILES}
        />
      </div>

      {previews.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {previews.map((item) => (
            <li
              key={item.id}
              className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
            >
              {item.isVideo ? (
                <video
                  src={item.dataUrl}
                  className="h-28 w-full object-cover"
                  controls
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.dataUrl}
                  alt={item.name}
                  className="h-28 w-full object-cover"
                />
              )}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  removePreview(item.id);
                }}
                className="absolute left-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                aria-label="حذف الملف"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
