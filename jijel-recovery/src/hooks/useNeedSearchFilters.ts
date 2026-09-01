"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  getDefaultNeedSearchFilters,
  parseNeedSearchParams,
  type NeedSearchFilters,
} from "@/lib/need-search";

/**
 * Parses URL search params after hydration so the first client render matches SSR.
 * Avoids hydration mismatches when the static shell and live URL query differ.
 */
export function useNeedSearchFilters(): NeedSearchFilters {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState(getDefaultNeedSearchFilters);

  useEffect(() => {
    setFilters(parseNeedSearchParams(searchParams));
  }, [searchParams]);

  return filters;
}
