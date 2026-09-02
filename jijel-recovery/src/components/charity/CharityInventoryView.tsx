"use client";

import { useMemo, useState, useTransition } from "react";
import { BadgeCheck, Loader2, Package, Search } from "lucide-react";

import {
  getCharityInventories,
  registerCharityInventory,
  requestCharityCoordination,
  type CharityInventoryRecord,
} from "@/actions/charity-inventory";
import type {
  CharityAvailability,
  CharityItemCategory,
} from "@/db/schema";
import {
  CHARITY_AVAILABILITY_OPTIONS,
  CHARITY_CATEGORY_OPTIONS,
  CHARITY_UNIT_OPTIONS,
  formatTargetDouars,
  getCharityAvailabilityLabel,
  getCharityCategoryIcon,
  getCharityCategoryLabel,
} from "@/lib/charity-inventory";
import {
  getCommunesByDaira,
  getCommuneArabicName,
  getDairas,
} from "@/lib/locations";
import { buildWhatsAppUrl } from "@/lib/phone";
import SpiritualCallout from "@/components/layout/SpiritualCallout";
import {
  formInputClass,
  glassPanelClass,
  premiumCardClass,
  primaryNextButtonClass,
  selectFieldClass,
} from "@/lib/ui-labels";
import { cn } from "@/lib/utils";

type CharityInventoryViewProps = {
  initialItems: CharityInventoryRecord[];
  initialCommune?: string;
};

type RegisterFormState = {
  charityName: string;
  representativeName: string;
  representativePhone: string;
  whatsappSameAsPhone: boolean;
  representativeWhatsapp: string;
  daira: string;
  commune: string;
  category: CharityItemCategory;
  itemTitle: string;
  availableQuantity: string;
  unit: string;
  coverageRadiusKm: string;
  targetDouarsText: string;
  notes: string;
};

const INITIAL_REGISTER_FORM: RegisterFormState = {
  charityName: "",
  representativeName: "",
  representativePhone: "",
  whatsappSameAsPhone: true,
  representativeWhatsapp: "",
  daira: "",
  commune: "",
  category: "water_equipment",
  itemTitle: "",
  availableQuantity: "",
  unit: "وحدة",
  coverageRadiusKm: "",
  targetDouarsText: "",
  notes: "",
};

function availabilityTone(
  availability: CharityAvailability,
): "emerald" | "amber" | "slate" | "red" {
  if (availability === "available") return "emerald";
  if (availability === "limited") return "amber";
  if (availability === "reserved") return "slate";
  return "red";
}

function CharityInventoryCard({
  item,
  onCoordinationSent,
}: {
  item: CharityInventoryRecord;
  onCoordinationSent: (message: string) => void;
}) {
  const [showCoordination, setShowCoordination] = useState(false);
  const [requesterName, setRequesterName] = useState("");
  const [requesterPhone, setRequesterPhone] = useState("");
  const [coordinationMessage, setCoordinationMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const whatsappPhone =
    item.representativeWhatsapp ?? item.representativePhone;
  const whatsappUrl = buildWhatsAppUrl(
    whatsappPhone,
    `السلام عليكم، نحتاج تنسيق استلام: ${item.itemTitle} — ${item.charityName} (${item.communeAr})`,
  );
  const coordinationWhatsappUrl = buildWhatsAppUrl(
    whatsappPhone,
    `طلب تنسيق واستلام\nالصنف: ${item.itemTitle}\nالجمعية: ${item.charityName}\nالبلدية: ${item.communeAr}\n${coordinationMessage}`,
  );

  async function handleCoordinationSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setIsSubmitting(true);

    const result = await requestCharityCoordination(
      item.id,
      requesterName,
      requesterPhone,
      coordinationMessage,
    );

    setIsSubmitting(false);

    if (!result.success) {
      onCoordinationSent(result.error ?? "تعذر إرسال الطلب.");
      return;
    }

    onCoordinationSent("تم تسجيل طلب التنسيق — يمكنك متابعة عبر واتساب.");
    setShowCoordination(false);

    if (coordinationWhatsappUrl) {
      window.open(coordinationWhatsappUrl, "_blank", "noopener,noreferrer");
    }
  }

  const tone = availabilityTone(item.availability);

  return (
    <article className={cn(premiumCardClass, "flex flex-col p-4")}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              {item.charityName}
            </h3>
            {item.verified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800">
                <BadgeCheck className="h-3.5 w-3.5" />
                موثّقة
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs font-medium text-slate-600">
            بلدية {item.communeAr} · دائرة {item.daira}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold",
            tone === "emerald" && "bg-emerald-100 text-emerald-900",
            tone === "amber" && "bg-amber-100 text-amber-900",
            tone === "slate" && "bg-slate-100 text-slate-700",
            tone === "red" && "bg-red-100 text-red-800",
          )}
        >
          {getCharityAvailabilityLabel(item.availability)}
        </span>
      </div>

      <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold text-slate-500">
          {getCharityCategoryIcon(item.category)}{" "}
          {getCharityCategoryLabel(item.category)}
        </p>
        <p className="mt-1 text-sm font-bold text-slate-900">{item.itemTitle}</p>
        <p className="mt-2 text-lg font-extrabold text-emerald-800">
          {item.availableQuantity.toLocaleString("ar-DZ")}{" "}
          <span className="text-sm font-bold text-slate-700">{item.unit}</span>
        </p>
        <p className="mt-2 text-xs text-slate-600">
          نطاق التغطية:{" "}
          {item.coverageRadiusKm
            ? `${item.coverageRadiusKm} كم`
            : "حسب التنسيق"}
          {item.targetDouars.length > 0
            ? ` · ${formatTargetDouars(item.targetDouars)}`
            : ""}
        </p>
      </div>

      <div className="mt-auto space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <a
            href={`tel:${item.representativePhone}`}
            className="flex h-10 items-center justify-center rounded-lg bg-emerald-700 text-sm font-bold text-white hover:bg-emerald-800"
          >
            📞 اتصال مباشر
          </a>
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 items-center justify-center rounded-lg bg-[#25D366] text-sm font-bold text-white hover:bg-[#20bd5a]"
            >
              💬 واتساب
            </a>
          ) : (
            <span className="flex h-10 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-500">
              واتساب غير متوفر
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowCoordination((current) => !current)}
          className="flex h-10 w-full items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 text-sm font-bold text-emerald-800 hover:bg-emerald-100"
        >
          طلب التنسيق والاستلام
        </button>

        {showCoordination ? (
          <form
            onSubmit={handleCoordinationSubmit}
            className="space-y-2 rounded-xl border border-slate-200 bg-white p-3"
          >
            <input
              required
              type="text"
              placeholder="اسمك"
              value={requesterName}
              onChange={(event) => setRequesterName(event.target.value)}
              className={formInputClass}
            />
            <input
              required
              type="tel"
              placeholder="رقم الهاتف"
              value={requesterPhone}
              onChange={(event) => setRequesterPhone(event.target.value)}
              className={formInputClass}
            />
            <textarea
              rows={2}
              placeholder="تفاصيل الطلب (كمية، موعد، دوار...)"
              value={coordinationMessage}
              onChange={(event) => setCoordinationMessage(event.target.value)}
              className={formInputClass}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(primaryNextButtonClass, "w-full")}
            >
              {isSubmitting ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              ) : (
                "إرسال طلب التنسيق"
              )}
            </button>
          </form>
        ) : null}
      </div>
    </article>
  );
}

export default function CharityInventoryView({
  initialItems,
  initialCommune = "",
}: CharityInventoryViewProps) {
  const [items, setItems] = useState(initialItems);
  const [communeFilter, setCommuneFilter] = useState(initialCommune);
  const [categoryFilter, setCategoryFilter] = useState<
    CharityItemCategory | ""
  >("");
  const [availabilityFilter, setAvailabilityFilter] = useState<
    CharityAvailability | "in_stock" | ""
  >("in_stock");
  const [searchQuery, setSearchQuery] = useState("");
  const [registerForm, setRegisterForm] =
    useState<RegisterFormState>(INITIAL_REGISTER_FORM);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isPending, startTransition] = useTransition();

  const dairas = useMemo(() => getDairas(), []);
  const communes = useMemo(
    () => (registerForm.daira ? getCommunesByDaira(registerForm.daira) : []),
    [registerForm.daira],
  );

  const communeOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      map.set(item.commune, item.communeAr);
    }
    for (const commune of communes) {
      map.set(commune.name, commune.name_ar);
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[1].localeCompare(b[1], "ar"),
    );
  }, [communes, items]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      if (communeFilter && item.commune !== communeFilter) {
        return false;
      }

      if (categoryFilter && item.category !== categoryFilter) {
        return false;
      }

      if (availabilityFilter === "in_stock") {
        if (!["available", "limited"].includes(item.availability)) {
          return false;
        }
      } else if (
        availabilityFilter &&
        item.availability !== availabilityFilter
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        item.charityName,
        item.itemTitle,
        item.communeAr,
        item.representativeName,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [
    availabilityFilter,
    categoryFilter,
    communeFilter,
    items,
    searchQuery,
  ]);

  function reloadItems() {
    startTransition(async () => {
      const result = await getCharityInventories({
        commune: communeFilter || undefined,
        category: categoryFilter || undefined,
        availability: availabilityFilter || undefined,
      });

      if (result.success && result.data) {
        setItems(result.data);
      }
    });
  }

  async function handleRegisterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRegisterError(null);
    setRegisterSuccess(null);
    setIsRegistering(true);

    const result = await registerCharityInventory({
      charityName: registerForm.charityName,
      representativeName: registerForm.representativeName,
      representativePhone: registerForm.representativePhone,
      whatsappSameAsPhone: registerForm.whatsappSameAsPhone,
      representativeWhatsapp: registerForm.representativeWhatsapp,
      daira: registerForm.daira,
      commune: registerForm.commune,
      category: registerForm.category,
      itemTitle: registerForm.itemTitle,
      availableQuantity: Number(registerForm.availableQuantity),
      unit: registerForm.unit,
      coverageRadiusKm: registerForm.coverageRadiusKm
        ? Number(registerForm.coverageRadiusKm)
        : undefined,
      targetDouarsText: registerForm.targetDouarsText,
      notes: registerForm.notes,
    });

    setIsRegistering(false);

    if (!result.success || !result.data) {
      setRegisterError(result.error ?? "تعذر تسجيل المخزون.");
      return;
    }

    setRegisterForm(INITIAL_REGISTER_FORM);
    setRegisterSuccess(
      process.env.NEXT_PUBLIC_CHARITY_REQUIRE_ADMIN_APPROVAL === "1"
        ? "تم إرسال التسجيل — سيظهر بعد مراجعة الإدارة."
        : "تم نشر المخزون مباشرة في السجل العام.",
    );
    setItems((current) => [result.data!, ...current]);
  }

  return (
    <div dir="rtl" className="dashboard-page mx-auto max-w-6xl space-y-6 px-4 py-6">
      <SpiritualCallout
        variant="emerald"
        className="border-emerald-200/80 bg-emerald-50 text-emerald-900"
        verse="« وَمَنْ أَحْيَاهَا فَكَأَنَّمَا أَحْيَا النَّاسَ جَمِيعًا »"
      />

      <section className={cn(glassPanelClass, "border-slate-800/20 p-5 shadow-xl")}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-slate-900">
              سجل مساعدات ومخزون الجمعيات الخيرية
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              دليل مباشر للفائض المتاح لدى الجمعيات: عتاد مائي، أعلاف، مواد بناء،
              وأغذية — مع تنسيق الاستلام للمداشر المتضررة.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900">
            <Package className="h-5 w-5" />
            {items.length.toLocaleString("ar-DZ")} صنف مسجّل
          </div>
        </div>
      </section>

      <section className={cn(premiumCardClass, "p-5")}>
        <h2 className="mb-4 text-lg font-bold text-slate-900">
          تسجيل فائض / عتاد متاح لدى الجمعية
        </h2>

        <form className="space-y-4" onSubmit={handleRegisterSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              required
              type="text"
              placeholder="اسم الجمعية"
              value={registerForm.charityName}
              onChange={(event) =>
                setRegisterForm((current) => ({
                  ...current,
                  charityName: event.target.value,
                }))
              }
              className={formInputClass}
            />
            <input
              required
              type="text"
              placeholder="اسم الممثل / المنسق"
              value={registerForm.representativeName}
              onChange={(event) =>
                setRegisterForm((current) => ({
                  ...current,
                  representativeName: event.target.value,
                }))
              }
              className={formInputClass}
            />
            <input
              required
              type="tel"
              placeholder="رقم الهاتف"
              value={registerForm.representativePhone}
              onChange={(event) =>
                setRegisterForm((current) => ({
                  ...current,
                  representativePhone: event.target.value,
                }))
              }
              className={formInputClass}
            />
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={registerForm.whatsappSameAsPhone}
                onChange={(event) =>
                  setRegisterForm((current) => ({
                    ...current,
                    whatsappSameAsPhone: event.target.checked,
                  }))
                }
                className="accent-emerald-700"
              />
              واتساب نفس رقم الهاتف
            </label>
            {!registerForm.whatsappSameAsPhone ? (
              <input
                type="tel"
                placeholder="رقم الواتساب"
                value={registerForm.representativeWhatsapp}
                onChange={(event) =>
                  setRegisterForm((current) => ({
                    ...current,
                    representativeWhatsapp: event.target.value,
                  }))
                }
                className={formInputClass}
              />
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <select
              required
              value={registerForm.daira}
              onChange={(event) =>
                setRegisterForm((current) => ({
                  ...current,
                  daira: event.target.value,
                  commune: "",
                }))
              }
              className={selectFieldClass}
            >
              <option value="">اختر الدائرة</option>
              {dairas.map((daira) => (
                <option key={daira.name} value={daira.name}>
                  {daira.name_ar}
                </option>
              ))}
            </select>
            <select
              required
              value={registerForm.commune}
              onChange={(event) =>
                setRegisterForm((current) => ({
                  ...current,
                  commune: event.target.value,
                }))
              }
              className={selectFieldClass}
              disabled={!registerForm.daira}
            >
              <option value="">اختر البلدية</option>
              {communes.map((commune) => (
                <option key={commune.name} value={commune.name}>
                  {commune.name_ar}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <select
              required
              value={registerForm.category}
              onChange={(event) =>
                setRegisterForm((current) => ({
                  ...current,
                  category: event.target.value as CharityItemCategory,
                }))
              }
              className={selectFieldClass}
            >
              {CHARITY_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.icon} {option.labelAr}
                </option>
              ))}
            </select>
            <input
              required
              type="text"
              placeholder="اسم الصنف بالتفصيل (مثال: خزان ماء 5000L)"
              value={registerForm.itemTitle}
              onChange={(event) =>
                setRegisterForm((current) => ({
                  ...current,
                  itemTitle: event.target.value,
                }))
              }
              className={formInputClass}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <input
              required
              type="number"
              min={1}
              placeholder="الكمية المتوفرة"
              value={registerForm.availableQuantity}
              onChange={(event) =>
                setRegisterForm((current) => ({
                  ...current,
                  availableQuantity: event.target.value,
                }))
              }
              className={formInputClass}
            />
            <select
              required
              value={registerForm.unit}
              onChange={(event) =>
                setRegisterForm((current) => ({
                  ...current,
                  unit: event.target.value,
                }))
              }
              className={selectFieldClass}
            >
              {CHARITY_UNIT_OPTIONS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              max={200}
              placeholder="نطاق التغطية (كم)"
              value={registerForm.coverageRadiusKm}
              onChange={(event) =>
                setRegisterForm((current) => ({
                  ...current,
                  coverageRadiusKm: event.target.value,
                }))
              }
              className={formInputClass}
            />
          </div>

          <textarea
            rows={2}
            placeholder="الدواوير/المداشر المستهدفة (افصل بفاصلة): مشاط، تابلوط..."
            value={registerForm.targetDouarsText}
            onChange={(event) =>
              setRegisterForm((current) => ({
                ...current,
                targetDouarsText: event.target.value,
              }))
            }
            className={formInputClass}
          />

          <textarea
            rows={2}
            placeholder="ملاحظات إضافية (شروط التسليم، أوقات التوفر...)"
            value={registerForm.notes}
            onChange={(event) =>
              setRegisterForm((current) => ({
                ...current,
                notes: event.target.value,
              }))
            }
            className={formInputClass}
          />

          {registerError ? (
            <p className="text-sm text-red-600">{registerError}</p>
          ) : null}
          {registerSuccess ? (
            <p className="text-sm font-semibold text-emerald-700">
              {registerSuccess}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isRegistering}
            className={cn(primaryNextButtonClass, "w-full sm:w-auto sm:px-8")}
          >
            {isRegistering ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            ) : (
              "نشر في السجل مباشرة"
            )}
          </button>
        </form>
      </section>

      <section className={cn(glassPanelClass, "space-y-4 p-4")}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="بحث باسم الجمعية أو الصنف..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className={cn(formInputClass, "pr-10")}
            />
          </label>

          <select
            value={communeFilter}
            onChange={(event) => setCommuneFilter(event.target.value)}
            className={selectFieldClass}
          >
            <option value="">كل البلديات</option>
            {communeOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(event) =>
              setCategoryFilter(event.target.value as CharityItemCategory | "")
            }
            className={selectFieldClass}
          >
            <option value="">كل التصنيفات</option>
            {CHARITY_CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.labelAr}
              </option>
            ))}
          </select>

          <select
            value={availabilityFilter}
            onChange={(event) =>
              setAvailabilityFilter(
                event.target.value as CharityAvailability | "in_stock" | "",
              )
            }
            className={selectFieldClass}
          >
            {CHARITY_AVAILABILITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.labelAr}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={reloadItems}
            disabled={isPending}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50"
          >
            {isPending ? "جاري التحديث..." : "تحديث"}
          </button>
        </div>

        {flashMessage ? (
          <p className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-900">
            {flashMessage}
          </p>
        ) : null}

        {filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <p className="text-sm font-semibold text-slate-700">
              لا توجد أصناف مطابقة للفلاتر الحالية.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              سجّل فائض جمعيتك في الاستمارة أعلاه ليظهر هنا فوراً.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => (
              <CharityInventoryCard
                key={item.id}
                item={item}
                onCoordinationSent={setFlashMessage}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
