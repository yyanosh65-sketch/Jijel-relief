"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Loader2,
  LocateFixed,
  MessageCircle,
} from "lucide-react";

import { submitDamageReport } from "@/actions/needs";
import NeedEvidenceCapture, {
  type NeedEvidencePayload,
} from "@/components/forms/NeedEvidenceCapture";
import {
  getCommuneCoordinates,
  getCommunesByDaira,
  getDairas,
} from "@/lib/locations";
import { buildWhatsAppShareUrl } from "@/lib/phone";
import {
  categoryButtonSelectedClass,
  categoryButtonUnselectedClass,
  formInputClass,
  formTextareaClass,
  glassPanelClass,
  primaryNextButtonClass,
  selectFieldClass,
} from "@/lib/ui-labels";
import { cn } from "@/lib/utils";

const INTAKE_CATEGORIES = [
  { value: "olive", label: "زيتون", unit: "شجرة" },
  { value: "livestock", label: "مواشي", unit: "رأس" },
  { value: "roof", label: "سقف", unit: "م²" },
  { value: "water", label: "دوزان ماء", unit: "لتر" },
] as const;

type IntakeCategory = (typeof INTAKE_CATEGORIES)[number]["value"];
type FormStep = 1 | 2 | 3 | 4;

const EMPTY_EVIDENCE: NeedEvidencePayload = {
  mediaUrls: [],
  voiceNoteData: null,
};

const STEP_LABELS: Record<FormStep, string> = {
  1: "الموقع",
  2: "الاحتياج",
  3: "الأدلة",
  4: "الاتصال",
};

export default function ReportDamageForm() {
  const [step, setStep] = useState<FormStep>(1);
  const [daira, setDaira] = useState("");
  const [commune, setCommune] = useState("");
  const [village, setVillage] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [hasGpsFix, setHasGpsFix] = useState(false);
  const [intakeCategory, setIntakeCategory] = useState<IntakeCategory | "">("");
  const [unit, setUnit] = useState("شجرة");
  const [quantity, setQuantity] = useState("");
  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState<NeedEvidencePayload>(EMPTY_EVIDENCE);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactWhatsapp, setContactWhatsapp] = useState("");
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [isAnalyzingVoice, setIsAnalyzingVoice] = useState(false);
  const [isAnalyzingVision, setIsAnalyzingVision] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);

  const dairas = useMemo(() => getDairas(), []);
  const communes = useMemo(
    () => (daira ? getCommunesByDaira(daira) : []),
    [daira],
  );
  const selectedCategory = INTAKE_CATEGORIES.find(
    (category) => category.value === intakeCategory,
  );

  const trackingUrl = useMemo(() => {
    if (!successId || typeof window === "undefined") {
      return "";
    }

    return `${window.location.origin}/map?needId=${successId}`;
  }, [successId]);

  const shareMessage = useMemo(() => {
    if (!trackingUrl) {
      return "";
    }

    const categoryLabel = selectedCategory?.label ?? "احتياج";
    const locationLabel = village ? `${commune} (${village})` : commune;

    return `طلب مساعدة — ${categoryLabel} في ${locationLabel}\nتتبع نسبة التكفل به:\n${trackingUrl}`;
  }, [trackingUrl, selectedCategory, commune, village]);

  const handleEvidenceChange = useCallback((payload: NeedEvidencePayload) => {
    setEvidence(payload);
    setAiMessage(null);
  }, []);

  async function analyzeVoiceNote() {
    if (!evidence.voiceNoteData) {
      return;
    }

    setIsAnalyzingVoice(true);
    setAiMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/agent/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceNoteData: evidence.voiceNoteData }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "تعذر تحليل الرسالة الصوتية.");
      }

      const structured = payload.structured as {
        commune?: string;
        daira?: string;
        douar?: string;
        contactPhone?: string;
        contactName?: string;
        intakeCategory?: IntakeCategory | "other";
        quantityNeeded?: number;
        unit?: string;
        description?: string;
        transcript?: string;
      };

      if (structured.daira) {
        setDaira(structured.daira);
      }
      if (structured.commune) {
        setCommune(structured.commune);
      }
      if (structured.douar) {
        setVillage(structured.douar);
      }
      if (structured.contactName) {
        setContactName(structured.contactName);
      }
      if (structured.contactPhone) {
        setContactPhone(structured.contactPhone);
        setContactWhatsapp(structured.contactPhone);
      }
      if (
        structured.intakeCategory &&
        structured.intakeCategory !== "other"
      ) {
        setIntakeCategory(structured.intakeCategory);
        const category = INTAKE_CATEGORIES.find(
          (entry) => entry.value === structured.intakeCategory,
        );
        if (category) {
          setUnit(category.unit);
        }
      }
      if (structured.quantityNeeded) {
        setQuantity(String(structured.quantityNeeded));
      }
      if (structured.unit) {
        setUnit(structured.unit);
      }
      if (structured.description) {
        setDescription(structured.description);
      }

      setAiMessage(
        structured.transcript
          ? `تم تحليل الرسالة الصوتية: «${structured.transcript.slice(0, 120)}${structured.transcript.length > 120 ? "…" : ""}»`
          : "تم استخراج بيانات الضرر من الرسالة الصوتية.",
      );
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : "تعذر تحليل الرسالة الصوتية.",
      );
    } finally {
      setIsAnalyzingVoice(false);
    }
  }

  async function analyzeDamageImages() {
    const images = evidence.mediaUrls.filter((url) =>
      url.startsWith("data:image/"),
    );

    if (images.length === 0) {
      setError("أرفق صورة واحدة على الأقل للتحليل البصري.");
      return;
    }

    setIsAnalyzingVision(true);
    setAiMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/agent/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrls: images }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "تعذر تحليل الصور.");
      }

      const triage = payload.triage as {
        intakeCategory?: IntakeCategory | "other";
        suggestedQuantity?: number;
        suggestedUnit?: string;
        summaryAr?: string;
        urgencyScore?: number;
      };

      if (triage.intakeCategory && triage.intakeCategory !== "other") {
        setIntakeCategory(triage.intakeCategory);
        const category = INTAKE_CATEGORIES.find(
          (entry) => entry.value === triage.intakeCategory,
        );
        if (category) {
          setUnit(category.unit);
        }
      }
      if (triage.suggestedQuantity) {
        setQuantity(String(Math.round(triage.suggestedQuantity)));
      }
      if (triage.suggestedUnit) {
        setUnit(triage.suggestedUnit);
      }
      if (triage.summaryAr) {
        setDescription(triage.summaryAr);
      }

      setAiMessage(
        `تحليل بصري: ${triage.summaryAr ?? "تم تقدير حجم الضرر"}${typeof triage.urgencyScore === "number" ? ` — درجة الاستعجال ${triage.urgencyScore}/100` : ""}`,
      );
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : "تعذر تحليل الصور.",
      );
    } finally {
      setIsAnalyzingVision(false);
    }
  }

  useEffect(() => {
    captureGps();
  }, []);

  function captureGps() {
    setIsCapturingGps(true);
    setGpsMessage(null);

    if (!navigator.geolocation) {
      setGpsMessage("المتصفح لا يدعم GPS — اختر البلدية والدشرة يدوياً.");
      setIsCapturingGps(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude.toFixed(6));
        setLng(position.coords.longitude.toFixed(6));
        setHasGpsFix(true);
        setGpsMessage("تم تحديد موقعك بدقة عبر GPS.");
        setIsCapturingGps(false);
      },
      () => {
        setHasGpsFix(false);
        setGpsMessage("تعذّر GPS — اختر البلدية والدشرة أدناه.");
        setIsCapturingGps(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  function handleCommuneChange(communeName: string) {
    const coordinates = getCommuneCoordinates(communeName);

    setCommune(communeName);

    if (coordinates && !hasGpsFix) {
      setLat(coordinates.lat.toFixed(6));
      setLng(coordinates.lng.toFixed(6));
      setGpsMessage("تم استخدام إحداثيات البلدية كبديل.");
    }
  }

  const canGoStep2 = Boolean(daira && commune && lat && lng);
  const canGoStep3 =
    intakeCategory !== "" && quantity.trim() !== "" && Number(quantity) > 0;
  const canGoStep4 =
    evidence.mediaUrls.length > 0 || evidence.voiceNoteData !== null;
  const canSubmit =
    contactName.trim().length >= 2 && contactPhone.trim().length >= 9;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit || !intakeCategory) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("intakeCategory", intakeCategory);
    formData.set("quantity", quantity);
    formData.set("unit", unit);
    formData.set("description", description);
    formData.set("daira", daira);
    formData.set("commune", commune);
    formData.set("village", village);
    formData.set("lat", lat);
    formData.set("lng", lng);
    formData.set("contactName", contactName);
    formData.set("contactPhone", contactPhone);

    if (contactWhatsapp.trim()) {
      formData.set("contactWhatsapp", contactWhatsapp);
    }

    if (evidence.mediaUrls.length > 0) {
      formData.set("mediaUrls", JSON.stringify(evidence.mediaUrls));
    }

    if (evidence.voiceNoteData) {
      formData.set("voiceNoteData", evidence.voiceNoteData);
    }

    const result = await submitDamageReport(formData);
    setIsSubmitting(false);

    if (result.ok) {
      setSuccessId(result.id);
      return;
    }

    setError(result.error);
  }

  async function copyLink() {
    if (!trackingUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(trackingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("تعذّر نسخ الرابط.");
    }
  }

  if (successId) {
    return (
      <div className={cn(glassPanelClass, "space-y-5 p-6 text-center")}>
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">
            تم تسجيل طلبك بنجاح!
          </h2>
          <p className="text-sm leading-relaxed text-slate-600">
            انسخ هذا الرابط لمشاركته مع المتبرعين أو الجمعيات لتتبع نسبة
            التكفل به
          </p>
        </div>

        <div
          className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left text-sm break-all text-slate-800"
          dir="ltr"
        >
          {trackingUrl}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={copyLink}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800"
          >
            <Copy className="h-4 w-4" />
            {copied ? "تم النسخ" : "نسخ الرابط"}
          </button>
          <a
            href={buildWhatsAppShareUrl(shareMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-semibold text-white hover:bg-[#20bd5a]"
          >
            <MessageCircle className="h-4 w-4" />
            مشاركة عبر واتساب
          </a>
        </div>

        <a
          href="/map"
          className="block w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
        >
          عرض على الخريطة
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex flex-wrap justify-center gap-2">
        {([1, 2, 3, 4] as FormStep[]).map((stepNumber) => (
          <span
            key={stepNumber}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              step === stepNumber
                ? "bg-emerald-700 text-white"
                : step > stepNumber
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-600",
            )}
          >
            الخطوة {stepNumber}: {STEP_LABELS[stepNumber]}
          </span>
        ))}
      </div>

      {step === 1 ? (
        <section className={cn(glassPanelClass, "space-y-4 p-5")}>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              الخطوة 1: تحديد البلدية والدشرة بدقة
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              حدّد موقعك عبر GPS ثم أكّد البلدية والدشرة
            </p>
          </div>

          <button
            type="button"
            onClick={captureGps}
            disabled={isCapturingGps}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 py-3 text-sm font-medium text-emerald-800"
          >
            {isCapturingGps ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LocateFixed className="h-4 w-4" />
            )}
            تحديد موقعي (GPS)
          </button>

          {gpsMessage ? (
            <p className="text-xs text-slate-600">{gpsMessage}</p>
          ) : null}

          {lat && lng ? (
            <p className="text-xs text-emerald-700" dir="ltr">
              {lat}, {lng}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <select
              required
              value={daira}
              onChange={(event) => {
                setDaira(event.target.value);
                setCommune("");
              }}
              className={selectFieldClass}
            >
              <option value="">الدائرة</option>
              {dairas.map((entry) => (
                <option key={entry.name} value={entry.name}>
                  {entry.name_ar}
                </option>
              ))}
            </select>

            <select
              required
              value={commune}
              disabled={!daira}
              onChange={(event) => handleCommuneChange(event.target.value)}
              className={cn(selectFieldClass, "disabled:opacity-50")}
            >
              <option value="">البلدية</option>
              {communes.map((entry) => (
                <option key={entry.name} value={entry.name}>
                  {entry.name_ar}
                </option>
              ))}
            </select>
          </div>

          <input
            value={village}
            onChange={(event) => setVillage(event.target.value)}
            placeholder="الدشرة / الحي (مثال: بومرساس، تاقريت...)"
            className={formInputClass}
          />

          <button
            type="button"
            disabled={!canGoStep2}
            onClick={() => setStep(2)}
            className={cn(primaryNextButtonClass, "w-full")}
          >
            التالي
          </button>
        </section>
      ) : null}

      {step === 2 ? (
        <section className={cn(glassPanelClass, "space-y-4 p-5")}>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              الخطوة 2: نوع الاحتياج والكمية
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              زيتون، مواشي، سقف، أو دوزان ماء
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {INTAKE_CATEGORIES.map((category) => (
              <button
                key={category.value}
                type="button"
                onClick={() => {
                  setIntakeCategory(category.value);
                  setUnit(category.unit);
                }}
                className={cn(
                  "px-2 text-sm transition-all",
                  intakeCategory === category.value
                    ? categoryButtonSelectedClass
                    : categoryButtonUnselectedClass,
                )}
              >
                {category.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              min={1}
              required
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder="الكمية"
              className={formInputClass}
            />
            <input
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
              placeholder="الوحدة"
              className={formInputClass}
            />
          </div>

          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="تفاصيل إضافية (اختياري) — اشرح حالتك باختصار..."
            rows={3}
            className={formTextareaClass}
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800"
            >
              رجوع
            </button>
            <button
              type="button"
              disabled={!canGoStep3}
              onClick={() => setStep(3)}
              className={cn(primaryNextButtonClass, "flex-1")}
            >
              التالي
            </button>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className={cn(glassPanelClass, "space-y-4 p-5")}>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              الخطوة 3: إرفاق الأدلة
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              صور الخسائر، فيديو، أو تسجيل صوتي يشرح حالتك
            </p>
          </div>

          <NeedEvidenceCapture value={evidence} onChange={handleEvidenceChange} />

          <div className="flex flex-wrap gap-2">
            {evidence.voiceNoteData ? (
              <button
                type="button"
                onClick={() => void analyzeVoiceNote()}
                disabled={isAnalyzingVoice}
                className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-900 hover:bg-violet-100 disabled:opacity-50"
              >
                {isAnalyzingVoice ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "🎙️"
                )}
                تحليل الرسالة الصوتية (Gemini)
              </button>
            ) : null}
            {evidence.mediaUrls.some((url) => url.startsWith("data:image/")) ? (
              <button
                type="button"
                onClick={() => void analyzeDamageImages()}
                disabled={isAnalyzingVision}
                className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-900 hover:bg-sky-100 disabled:opacity-50"
              >
                {isAnalyzingVision ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "📸"
                )}
                تقييم الضرر بالصور (Vision)
              </button>
            ) : null}
          </div>

          {aiMessage ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
              {aiMessage}
            </p>
          ) : null}

          {!canGoStep4 ? (
            <p className="text-center text-xs text-slate-500">
              أرفق صورة أو فيديو أو سجّل رسالة صوتية للمتابعة
            </p>
          ) : null}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700"
            >
              رجوع
            </button>
            <button
              type="button"
              disabled={!canGoStep4}
              onClick={() => setStep(4)}
              className="flex-1 rounded-xl bg-emerald-700 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              التالي
            </button>
          </div>
        </section>
      ) : null}

      {step === 4 ? (
        <section className={cn(glassPanelClass, "space-y-4 p-5")}>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              الخطوة 4: معلومات الاتصال بالمستفيد
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              الاسم، الهاتف، ورقم الواتساب
            </p>
          </div>

          <input
            required
            value={contactName}
            onChange={(event) => setContactName(event.target.value)}
            placeholder="الاسم الكامل"
            className={formInputClass}
          />

          <input
            required
            type="tel"
            dir="ltr"
            value={contactPhone}
            onChange={(event) => setContactPhone(event.target.value)}
            placeholder="05XX XX XX XX"
            className={cn(formInputClass, "text-left")}
          />

          <input
            type="tel"
            dir="ltr"
            value={contactWhatsapp}
            onChange={(event) => setContactWhatsapp(event.target.value)}
            placeholder="رقم الواتساب (نفس الهاتف أو آخر)"
            className={cn(formInputClass, "text-left")}
          />

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700"
            >
              رجوع
            </button>
            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              إرسال الطلب
            </button>
          </div>
        </section>
      ) : null}
    </form>
  );
}
