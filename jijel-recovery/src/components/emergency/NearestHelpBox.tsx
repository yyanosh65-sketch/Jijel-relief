"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageCircle, Phone } from "lucide-react";

import {
  getNearestEmergencyContacts,
  type NearestContact,
} from "@/actions/emergency";
import { buildWhatsAppLink } from "@/lib/phone";
import { cn } from "@/lib/utils";

type NearestHelpBoxProps = {
  lat: string;
  lng: string;
  commune: string;
  hasGps: boolean;
};

export default function NearestHelpBox({
  lat,
  lng,
  commune,
  hasGps,
}: NearestHelpBoxProps) {
  const [contacts, setContacts] = useState<NearestContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canQuery = Boolean((lat && lng) || commune);

  useEffect(() => {
    if (!canQuery) {
      setContacts([]);
      return;
    }

    let cancelled = false;

    async function loadContacts() {
      setIsLoading(true);
      setError(null);

      const result = await getNearestEmergencyContacts({
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined,
        commune: commune || undefined,
      });

      if (cancelled) {
        return;
      }

      setIsLoading(false);

      if (!result.success) {
        setError(result.error ?? "تعذر تحميل جهات المساعدة.");
        setContacts([]);
        return;
      }

      setContacts(result.data ?? []);
    }

    void loadContacts();

    return () => {
      cancelled = true;
    };
  }, [canQuery, commune, hasGps, lat, lng]);

  if (!canQuery) {
    return null;
  }

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/80 p-4">
      <h3 className="text-sm font-bold text-amber-900">
        🚨 أرقام النجدة الأقرب إليك حالياً
      </h3>
      <p className="mt-1 text-xs text-amber-800/80">
        أقرب جهات مساعدة لموقعك
      </p>

      {isLoading ? (
        <div className="mt-3 flex items-center justify-center gap-2 py-4 text-sm text-amber-800">
          <Loader2 className="h-4 w-4 animate-spin" />
          جاري البحث عن أقرب المساعدة...
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 text-xs text-red-600">{error}</p>
      ) : null}

      {!isLoading && contacts.length === 0 && !error ? (
        <p className="mt-3 text-xs text-amber-800">
          لا توجد جهات مساعدة مسجّلة قريبة — أكمل تحديد الموقع.
        </p>
      ) : null}

      <ul className="mt-3 space-y-2">
        {contacts.map((contact) => {
          const whatsAppUrl = buildWhatsAppLink(contact.phone);

          return (
            <li
              key={contact.id}
              className="rounded-lg border border-amber-100 bg-white p-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-900">
                    {contact.name}
                  </p>
                  <p className="text-xs text-zinc-500">{contact.subtitle}</p>
                  {contact.distanceKm !== null ? (
                    <p className="mt-1 text-xs font-medium text-emerald-700">
                      على بعد {contact.distanceKm} كم
                    </p>
                  ) : null}
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                    contact.kind === "facility"
                      ? "bg-red-100 text-red-700"
                      : "bg-blue-100 text-blue-700",
                  )}
                >
                  {contact.kind === "facility" ? "رسمي" : "متطوع"}
                </span>
              </div>

              <div className="mt-2 flex gap-2">
                <a
                  href={`tel:${contact.phone}`}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-red-600 px-2 py-2 text-xs font-semibold text-white hover:bg-red-700"
                >
                  <Phone className="h-3.5 w-3.5" />
                  اتصال
                </a>
                {whatsAppUrl ? (
                  <a
                    href={whatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    واتساب
                  </a>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
