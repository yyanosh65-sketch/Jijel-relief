"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Pause, Play, Square } from "lucide-react";

import OfflineSmsFallbackModal from "@/components/emergency/OfflineSmsFallbackModal";
import MapInspectionShell from "@/components/map/MapInspectionShell";
import type { TrailClearanceLevel } from "@/db/schema";
import {
  cacheOfflineSubmission,
  isBrowserOffline,
  isLikelyNetworkError,
  type EmergencySmsDraft,
} from "@/lib/offline-storage";
import {
  TRAIL_CLEARANCE_LEVELS,
  TRAIL_CLEARANCE_META,
  type SerializedMountainTrail,
} from "@/lib/trail-clearance";
import { cn } from "@/lib/utils";

const MAX_VOICE_SECONDS = 15;

type TrailDetailPanelProps = {
  trail: SerializedMountainTrail | null;
  open: boolean;
  onClose: () => void;
  onUpdated?: (trail: SerializedMountainTrail) => void;
};

export default function TrailDetailPanel({
  trail,
  open,
  onClose,
  onUpdated,
}: TrailDetailPanelProps) {
  const [current, setCurrent] = useState<SerializedMountainTrail | null>(trail);
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [voiceDataUrl, setVoiceDataUrl] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [smsDraft, setSmsDraft] = useState<EmergencySmsDraft | null>(null);
  const [smsPayload, setSmsPayload] = useState<unknown>(null);

  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrent, setAudioCurrent] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopRecordingInternal() {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      recorder.stream.getTracks().forEach((track) => track.stop());
    }
    mediaRecorderRef.current = null;
    setRecording(false);
  }

  useEffect(() => {
    setCurrent(trail);
    setNotes(trail?.notes ?? "");
    setVoiceDataUrl(null);
    setError(null);
    setSuccess(null);
    setAudioPlaying(false);
    setAudioCurrent(0);
  }, [trail]);

  useEffect(() => {
    return () => {
      stopRecordingInternal();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const meta = current
    ? TRAIL_CLEARANCE_META[current.clearanceLevel]
    : null;
  const scoutAudio = current
    ? voiceDataUrl || current.audioVoiceNoteUrl
    : null;

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorderRef.current = recorder;
      setRecordSeconds(0);
      setRecording(true);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            setVoiceDataUrl(reader.result);
          }
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((seconds) => {
          const next = seconds + 1;
          if (next >= MAX_VOICE_SECONDS) {
            stopRecordingInternal();
          }
          return next;
        });
      }, 1000);
    } catch {
      setError("تعذر الوصول للميكروفون.");
      setRecording(false);
    }
  }

  function toggleScoutAudio() {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
      setAudioPlaying(true);
    } else {
      el.pause();
      setAudioPlaying(false);
    }
  }

  async function submitClearance(level: TrailClearanceLevel) {
    const trailRow = current;
    if (!trailRow) return;
    setError(null);
    setSuccess(null);

    const payload = {
      id: trailRow.id,
      roadCode: trailRow.roadCode,
      settlementId: trailRow.settlementId,
      clearanceLevel: level,
      audioVoiceNoteUrl: voiceDataUrl || trailRow.audioVoiceNoteUrl,
      notes: notes.trim() || null,
      reportedByPhone: phone.trim() || trailRow.reportedByPhone || "0500000000",
      lat: trailRow.lat,
      lng: trailRow.lng,
    };

    const offlineDraft: EmergencySmsDraft = {
      type: "TRAIL",
      locationCodeOrName: trailRow.roadCode,
      urgency: level,
      contactPhone: payload.reportedByPhone,
    };

    if (isBrowserOffline()) {
      await cacheOfflineSubmission("TRAIL", {
        form: payload,
        draft: offlineDraft,
      });
      setSmsDraft(offlineDraft);
      setSmsPayload({ form: payload, draft: offlineDraft });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/trails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as {
        success?: boolean;
        error?: string;
        data?: SerializedMountainTrail;
      };

      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.error ?? "تعذر تحديث المسلك.");
      }

      setCurrent(json.data);
      onUpdated?.(json.data);
      setSuccess("تم تحديث حالة المسلك.");
      setVoiceDataUrl(null);
    } catch (submitError) {
      if (isLikelyNetworkError(submitError)) {
        await cacheOfflineSubmission("TRAIL", {
          form: payload,
          draft: offlineDraft,
        });
        setSmsDraft(offlineDraft);
        setSmsPayload({ form: payload, draft: offlineDraft });
        return;
      }
      setError(
        submitError instanceof Error
          ? submitError.message
          : "تعذر تحديث المسلك.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!open || !current || !meta) {
    return null;
  }

  return (
    <>
      <MapInspectionShell
        open={open}
        onClose={onClose}
        titleId="trail-detail-title"
      >
        <header className="mb-4">
          <p className="text-xs font-medium text-slate-400">مسلك جبلي</p>
          <h2
            id="trail-detail-title"
            className="mt-1 text-lg font-bold text-white"
          >
            {current.roadCode}
          </h2>
          <p className="mt-1 font-mono text-[11px] text-slate-500" dir="ltr">
            {Number(current.lat).toFixed(4)}, {Number(current.lng).toFixed(4)}
          </p>
        </header>

        <div
          className={cn(
            "mb-4 rounded-2xl border px-3 py-3 text-sm font-bold",
            meta.badgeClass,
          )}
        >
          <span className="me-2">{meta.emoji}</span>
          {meta.labelAr}
          {current.clearanceLevel === "completely_blocked" ||
          current.clearanceLevel === "strict_4x4_required" ? (
            <p className="mt-1 text-xs font-semibold opacity-90">
              تحذير: لا تحاول المرور بمركبة غير مناسبة.
            </p>
          ) : null}
        </div>

        {scoutAudio ? (
          <section className="mb-4 rounded-2xl border border-slate-700/80 bg-slate-950/50 p-3">
            <p className="mb-2 text-xs font-semibold text-slate-200">
              اسمع إفادة الكشاف الميداني (تسجيل صوتي)
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleScoutAudio}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-violet-500/40 bg-violet-600/30 text-violet-100"
                aria-label={audioPlaying ? "إيقاف" : "تشغيل"}
              >
                {audioPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-violet-400 transition-all"
                    style={{
                      width:
                        audioDuration > 0
                          ? `${Math.min(100, (audioCurrent / audioDuration) * 100)}%`
                          : "0%",
                    }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-slate-400" dir="ltr">
                  {formatTime(audioCurrent)} / {formatTime(audioDuration)}
                </p>
              </div>
            </div>
            <audio
              ref={audioRef}
              src={scoutAudio}
              className="hidden"
              onLoadedMetadata={(event) =>
                setAudioDuration(event.currentTarget.duration || 0)
              }
              onTimeUpdate={(event) =>
                setAudioCurrent(event.currentTarget.currentTime || 0)
              }
              onEnded={() => setAudioPlaying(false)}
            />
          </section>
        ) : null}

        {current.notes ? (
          <p className="mb-4 rounded-xl border border-slate-800 bg-black/30 p-3 text-sm leading-relaxed text-slate-300">
            {current.notes}
          </p>
        ) : null}

        <section className="space-y-3 rounded-2xl border border-slate-700/80 bg-slate-950/40 p-3">
          <h3 className="text-sm font-bold text-white">
            تحديث سريع لحالة المسلك
          </h3>

          <div className="grid grid-cols-2 gap-2">
            {TRAIL_CLEARANCE_LEVELS.map((level) => {
              const levelMeta = TRAIL_CLEARANCE_META[level];
              const active = current.clearanceLevel === level;
              return (
                <button
                  key={level}
                  type="button"
                  disabled={submitting}
                  onClick={() => void submitClearance(level)}
                  className={cn(
                    "rounded-xl border px-2.5 py-2.5 text-right text-[11px] font-bold transition active:scale-[0.98] disabled:opacity-60",
                    active
                      ? levelMeta.badgeClass
                      : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500",
                  )}
                >
                  <span className="me-1">{levelMeta.emoji}</span>
                  {levelMeta.shortAr}
                </button>
              );
            })}
          </div>

          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="رقم هاتف المبلّغ (اختياري إن كان محفوظاً)"
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
          />

          <textarea
            rows={2}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="ملاحظة نصية سريعة (اختياري)"
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
          />

          <div className="flex items-center gap-2">
            {recording ? (
              <button
                type="button"
                onClick={stopRecordingInternal}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-600/20 px-3 py-2 text-xs font-bold text-rose-100"
              >
                <Square className="h-3.5 w-3.5" />
                إيقاف ({recordSeconds}ث / {MAX_VOICE_SECONDS})
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void startRecording()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200"
              >
                <Mic className="h-3.5 w-3.5" />
                تسجيل صوتي سريع (≤ {MAX_VOICE_SECONDS}ث)
              </button>
            )}
          </div>

          {voiceDataUrl ? (
            <p className="text-[11px] text-emerald-300">
              تم تجهيز التسجيل — اختر مستوى المسلك أعلاه لإرساله معه.
            </p>
          ) : null}

          {submitting ? (
            <p className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> جاري الحفظ...
            </p>
          ) : null}
          {error ? (
            <p className="text-xs font-semibold text-rose-300">{error}</p>
          ) : null}
          {success ? (
            <p className="text-xs font-semibold text-emerald-300">{success}</p>
          ) : null}
        </section>
      </MapInspectionShell>

      {smsDraft ? (
        <OfflineSmsFallbackModal
          open
          draft={smsDraft}
          payload={smsPayload}
          onClose={() => {
            setSmsDraft(null);
            setSmsPayload(null);
          }}
        />
      ) : null}
    </>
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
