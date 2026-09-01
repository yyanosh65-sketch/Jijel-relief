"use client";

import { useState } from "react";
import {
  Droplets,
  HeartPulse,
  Home,
  Loader2,
  LocateFixed,
  MapPin,
  Package,
  Shirt,
  Truck,
  Utensils,
  type LucideIcon,
} from "lucide-react";

import { createNeed } from "@/actions/needs";
import type { NeedCategory } from "@/db/schema";
import { JIJEL_DAIRAS, QUANTITY_UNITS } from "@/lib/jijel-locations";
import { formatAlgerianPhoneHint, isValidAlgerianPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

type FormStep = 1 | 2 | 3;

type CategoryOption = {
  value: NeedCategory;
  labelFr: string;
  labelDz: string;
  icon: LucideIcon;
};

const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    value: "shelter",
    labelFr: "Abris / Reconstruction",
    labelDz: "مسكن / إعادة بناء",
    icon: Home,
  },
  {
    value: "food",
    labelFr: "Alimentation / Bétail",
    labelDz: "مؤونة / بقر",
    icon: Utensils,
  },
  {
    value: "water",
    labelFr: "Eau",
    labelDz: "ما",
    icon: Droplets,
  },
  {
    value: "medical",
    labelFr: "Santé",
    labelDz: "صحة",
    icon: HeartPulse,
  },
  {
    value: "clothing",
    labelFr: "Vêtements",
    labelDz: "ملابس",
    icon: Shirt,
  },
  {
    value: "transport",
    labelFr: "Outils / Transport",
    labelDz: "أدوات / نقل",
    icon: Truck,
  },
  {
    value: "other",
    labelFr: "Autre (arbres, matériel)",
    labelDz: "أخرى (أشجار، عتاد)",
    icon: Package,
  },
];

type LocationState = {
  daira: string;
  commune: string;
  village: string;
  lat: string;
  lng: string;
};

type NeedState = {
  category: NeedCategory | "";
  title: string;
  description: string;
  quantity: string;
  unit: string;
};

type ContactState = {
  name: string;
  phone: string;
};

const INITIAL_LOCATION: LocationState = {
  daira: "",
  commune: "",
  village: "",
  lat: "",
  lng: "",
};

const INITIAL_NEED: NeedState = {
  category: "",
  title: "",
  description: "",
  quantity: "",
  unit: QUANTITY_UNITS[0].value,
};

const INITIAL_CONTACT: ContactState = {
  name: "",
  phone: "",
};

function BilingualLabel({
  dz,
  fr,
}: {
  dz: string;
  fr: string;
}) {
  return (
    <span className="block">
      <span className="font-medium text-zinc-900">{dz}</span>
      <span className="mt-0.5 block text-xs text-zinc-500">{fr}</span>
    </span>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

export default function ReportDamageForm() {
  const [step, setStep] = useState<FormStep>(1);
  const [location, setLocation] = useState<LocationState>(INITIAL_LOCATION);
  const [need, setNeed] = useState<NeedState>(INITIAL_NEED);
  const [contact, setContact] = useState<ContactState>(INITIAL_CONTACT);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  function validateStep1(): boolean {
    const nextErrors: Record<string, string> = {};

    if (!location.daira) {
      nextErrors.daira = "خاصك تختار الدائرة — Veuillez sélectionner une daïra.";
    }

    if (!location.commune.trim()) {
      nextErrors.commune = "خاصك تكتب البلدية — Veuillez saisir la commune.";
    }

    if (!location.village.trim()) {
      nextErrors.village = "خاصك تكتب اسم القرية — Veuillez saisir le village.";
    }

    if (!location.lat || !location.lng) {
      nextErrors.gps =
        "خاصك تحدد الموقع بال GPS — Activez la localisation GPS.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateStep2(): boolean {
    const nextErrors: Record<string, string> = {};

    if (!need.category) {
      nextErrors.category = "خاصك تختار الفئة — Veuillez choisir une catégorie.";
    }

    if (!need.title.trim()) {
      nextErrors.title = "خاصك تكتب العنوان — Veuillez saisir un titre.";
    }

    if (!need.description.trim()) {
      nextErrors.description =
        "خاصك تشرح الحاجة — Veuillez décrire le besoin.";
    }

    const quantity = Number(need.quantity);

    if (!need.quantity || Number.isNaN(quantity) || quantity <= 0) {
      nextErrors.quantity =
        "الكمية خاصها تكون أكبر من صفر — Quantité invalide.";
    }

    if (!need.unit) {
      nextErrors.unit = "خاصك تختار الوحدة — Veuillez choisir une unité.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateStep3(): boolean {
    const nextErrors: Record<string, string> = {};

    if (!contact.name.trim()) {
      nextErrors.name = "خاصك تكتب الاسم — Veuillez saisir le nom.";
    }

    if (!contact.phone.trim()) {
      nextErrors.phone = "خاصك تكتب رقم الهاتف — Numéro requis.";
    } else if (!isValidAlgerianPhone(contact.phone)) {
      nextErrors.phone =
        "رقم جزائري غالط — Numéro algérien invalide (05/06/07 ou +213).";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleNext() {
    setSubmitError(null);

    if (step === 1 && validateStep1()) {
      setStep(2);
      return;
    }

    if (step === 2 && validateStep2()) {
      setStep(3);
    }
  }

  function handleBack() {
    setErrors({});
    setSubmitError(null);
    setStep((current) => (current > 1 ? ((current - 1) as FormStep) : current));
  }

  async function captureGps() {
    setIsCapturingGps(true);
    setGpsMessage(null);
    setErrors((current) => {
      const next = { ...current };
      delete next.gps;
      return next;
    });

    if (!navigator.geolocation) {
      setGpsMessage(
        "المتصفح ما يدعمش GPS — Géolocalisation non supportée.",
      );
      setIsCapturingGps(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation((current) => ({
          ...current,
          lat: position.coords.latitude.toFixed(6),
          lng: position.coords.longitude.toFixed(6),
        }));
        setGpsMessage(
          "تم تحديد الموقع — Position enregistrée.",
        );
        setIsCapturingGps(false);
      },
      () => {
        setGpsMessage(
          "ما قدرناش نحددو الموقع — Impossible d'obtenir la position.",
        );
        setIsCapturingGps(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    if (!validateStep3()) {
      return;
    }

    setIsSubmitting(true);

    const unitLabel =
      QUANTITY_UNITS.find((unit) => unit.value === need.unit)?.labelFr ??
      need.unit;

    const formData = new FormData();
    formData.set("daira", location.daira);
    formData.set("address", location.commune.trim());
    formData.set("locationName", location.village.trim());
    formData.set("lat", location.lat);
    formData.set("lng", location.lng);
    formData.set("category", need.category);
    formData.set("urgency", "medium");
    formData.set("title", need.title.trim());
    formData.set(
      "description",
      `${need.description.trim()}\n\nUnité / الوحدة: ${need.quantity} ${unitLabel}`,
    );
    formData.set("quantityNeeded", need.quantity);
    formData.set("contactName", contact.name.trim());
    formData.set("contactPhone", contact.phone.trim());

    const result = await createNeed(formData);

    setIsSubmitting(false);

    if (!result.success) {
      setSubmitError(
        result.error ??
          "وقع مشكل فالإرسال — Erreur lors de l'envoi du signalement.",
      );
      return;
    }

    setIsSuccess(true);
  }

  function resetForm() {
    setStep(1);
    setLocation(INITIAL_LOCATION);
    setNeed(INITIAL_NEED);
    setContact(INITIAL_CONTACT);
    setErrors({});
    setGpsMessage(null);
    setSubmitError(null);
    setIsSuccess(false);
  }

  if (isSuccess) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white">
          <MapPin className="h-7 w-7" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-emerald-900">
            تم التسجيل بنجاح
          </h2>
          <p className="mt-1 text-sm text-emerald-800">
            Signalement enregistré — شكراً، غادي يتصلو بيك قريباً.
          </p>
        </div>
        <button
          type="button"
          onClick={resetForm}
          className="mt-2 w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          إرسال signalement جديد / Nouveau signalement
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-lg flex-col gap-6"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
          <span>
            الخطوة {step} من 3 — Étape {step} sur 3
          </span>
          <span>{Math.round((step / 3) * 100)}%</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((value) => (
            <div
              key={value}
              className={cn(
                "h-2 rounded-full transition-colors",
                value <= step ? "bg-emerald-600" : "bg-zinc-200",
              )}
            />
          ))}
        </div>
      </div>

      {step === 1 ? (
        <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
          <header>
            <h2 className="text-lg font-semibold text-zinc-900">
              الموقع — Localisation
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              حدد الدائرة، البلدية، والقرية باش نعرفو فين الحاجة.
            </p>
            <p className="text-xs text-zinc-500">
              Indiquez la daïra, la commune et le village concernés.
            </p>
          </header>

          <div>
            <label htmlFor="daira" className="mb-2 block text-sm">
              <BilingualLabel dz="الدائرة" fr="Daïra" />
            </label>
            <select
              id="daira"
              value={location.daira}
              onChange={(event) =>
                setLocation((current) => ({
                  ...current,
                  daira: event.target.value,
                }))
              }
              className="min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-emerald-600"
            >
              <option value="">اختار / Choisir...</option>
              {JIJEL_DAIRAS.map((daira) => (
                <option key={daira} value={daira}>
                  {daira}
                </option>
              ))}
            </select>
            <FieldError message={errors.daira} />
          </div>

          <div>
            <label htmlFor="commune" className="mb-2 block text-sm">
              <BilingualLabel dz="البلدية" fr="Commune" />
            </label>
            <input
              id="commune"
              type="text"
              value={location.commune}
              onChange={(event) =>
                setLocation((current) => ({
                  ...current,
                  commune: event.target.value,
                }))
              }
              placeholder="مثال: El Aouana"
              className="min-h-12 w-full rounded-xl border border-zinc-300 px-3 text-sm outline-none focus:border-emerald-600"
            />
            <FieldError message={errors.commune} />
          </div>

          <div>
            <label htmlFor="village" className="mb-2 block text-sm">
              <BilingualLabel dz="القرية / الحي" fr="Village ou quartier" />
            </label>
            <input
              id="village"
              type="text"
              value={location.village}
              onChange={(event) =>
                setLocation((current) => ({
                  ...current,
                  village: event.target.value,
                }))
              }
              placeholder="مثال: Taher centre"
              className="min-h-12 w-full rounded-xl border border-zinc-300 px-3 text-sm outline-none focus:border-emerald-600"
            />
            <FieldError message={errors.village} />
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => void captureGps()}
              disabled={isCapturingGps}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCapturingGps ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LocateFixed className="h-4 w-4" />
              )}
              {isCapturingGps
                ? "جاري تحديد الموقع... / Localisation..."
                : "حدد موقعي GPS / Utiliser ma position GPS"}
            </button>
            {location.lat && location.lng ? (
              <p className="text-xs text-emerald-700">
                GPS: {location.lat}, {location.lng}
              </p>
            ) : null}
            {gpsMessage ? (
              <p className="text-xs text-zinc-600">{gpsMessage}</p>
            ) : null}
            <FieldError message={errors.gps} />
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
          <header>
            <h2 className="text-lg font-semibold text-zinc-900">
              الحاجة — Besoin
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              شنو خاصكم بالضبط؟ قولولنا بالتفصيل.
            </p>
            <p className="text-xs text-zinc-500">
              Décrivez précisément le besoin de la communauté.
            </p>
          </header>

          <div>
            <p className="mb-2 text-sm">
              <BilingualLabel dz="الفئة" fr="Catégorie" />
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CATEGORY_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = need.category === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setNeed((current) => ({
                        ...current,
                        category: option.value,
                      }))
                    }
                    className={cn(
                      "flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border px-2 py-3 text-center text-xs transition",
                      isSelected
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium leading-tight">
                      {option.labelDz}
                    </span>
                    <span className="text-[10px] leading-tight text-zinc-500">
                      {option.labelFr}
                    </span>
                  </button>
                );
              })}
            </div>
            <FieldError message={errors.category} />
          </div>

          <div>
            <label htmlFor="title" className="mb-2 block text-sm">
              <BilingualLabel dz="العنوان" fr="Titre du besoin" />
            </label>
            <input
              id="title"
              type="text"
              value={need.title}
              onChange={(event) =>
                setNeed((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="مثال: أشجار زيتون للمزارعين"
              className="min-h-12 w-full rounded-xl border border-zinc-300 px-3 text-sm outline-none focus:border-emerald-600"
            />
            <FieldError message={errors.title} />
          </div>

          <div>
            <label htmlFor="description" className="mb-2 block text-sm">
              <BilingualLabel dz="الوصف" fr="Description" />
            </label>
            <textarea
              id="description"
              rows={4}
              value={need.description}
              onChange={(event) =>
                setNeed((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="شرح الحالة والضرر..."
              className="w-full rounded-xl border border-zinc-300 px-3 py-3 text-sm outline-none focus:border-emerald-600"
            />
            <FieldError message={errors.description} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="quantity" className="mb-2 block text-sm">
                <BilingualLabel dz="الكمية" fr="Quantité" />
              </label>
              <input
                id="quantity"
                type="number"
                min={1}
                value={need.quantity}
                onChange={(event) =>
                  setNeed((current) => ({
                    ...current,
                    quantity: event.target.value,
                  }))
                }
                className="min-h-12 w-full rounded-xl border border-zinc-300 px-3 text-sm outline-none focus:border-emerald-600"
              />
              <FieldError message={errors.quantity} />
            </div>

            <div>
              <label htmlFor="unit" className="mb-2 block text-sm">
                <BilingualLabel dz="الوحدة" fr="Unité" />
              </label>
              <select
                id="unit"
                value={need.unit}
                onChange={(event) =>
                  setNeed((current) => ({
                    ...current,
                    unit: event.target.value,
                  }))
                }
                className="min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-emerald-600"
              >
                {QUANTITY_UNITS.map((unit) => (
                  <option key={unit.value} value={unit.value}>
                    {unit.labelDz} — {unit.labelFr}
                  </option>
                ))}
              </select>
              <FieldError message={errors.unit} />
            </div>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
          <header>
            <h2 className="text-lg font-semibold text-zinc-900">
              الاتصال — Contact
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              باش نقدرو نتصلو بيك ونتأكدو من المعلومات.
            </p>
            <p className="text-xs text-zinc-500">
              Coordonnées du bénéficiaire ou du délégué local.
            </p>
          </header>

          <div>
            <label htmlFor="contactName" className="mb-2 block text-sm">
              <BilingualLabel dz="الاسم واللقب" fr="Nom et prénom" />
            </label>
            <input
              id="contactName"
              type="text"
              value={contact.name}
              onChange={(event) =>
                setContact((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              className="min-h-12 w-full rounded-xl border border-zinc-300 px-3 text-sm outline-none focus:border-emerald-600"
            />
            <FieldError message={errors.name} />
          </div>

          <div>
            <label htmlFor="contactPhone" className="mb-2 block text-sm">
              <BilingualLabel dz="رقم الهاتف" fr="Téléphone mobile" />
            </label>
            <input
              id="contactPhone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={contact.phone}
              onChange={(event) =>
                setContact((current) => ({
                  ...current,
                  phone: event.target.value,
                }))
              }
              placeholder={formatAlgerianPhoneHint()}
              className="min-h-12 w-full rounded-xl border border-zinc-300 px-3 text-sm outline-none focus:border-emerald-600"
            />
            <p className="mt-1 text-xs text-zinc-500">
              رقم جزائري: 05، 06، 07 — Format: {formatAlgerianPhoneHint()}
            </p>
            <FieldError message={errors.phone} />
          </div>

          {submitError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {submitError}
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="sticky bottom-0 -mx-1 flex gap-3 border-t border-zinc-200 bg-zinc-50/95 px-1 py-4 backdrop-blur">
        {step > 1 ? (
          <button
            type="button"
            onClick={handleBack}
            disabled={isSubmitting}
            className="min-h-12 flex-1 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          >
            رجوع / Retour
          </button>
        ) : null}

        {step < 3 ? (
          <button
            type="button"
            onClick={handleNext}
            className="min-h-12 flex-1 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            التالي / Suivant
          </button>
        ) : (
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري الإرسال... / Envoi...
              </>
            ) : (
              "إرسال / Envoyer"
            )}
          </button>
        )}
      </div>
    </form>
  );
}
