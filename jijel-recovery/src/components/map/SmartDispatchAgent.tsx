"use client";

import AmiRabahPanel from "@/components/assistant/AmiRabahPanel";

type SmartDispatchAgentProps = {
  needId?: number | null;
  settlementId?: number | null;
  scope?: "field" | "wilaya";
  hideHeader?: boolean;
  className?: string;
};

/** Thin adapter — Ami Rabah powers field + wilaya smart dispatch. */
export default function SmartDispatchAgent({
  needId,
  settlementId,
  scope = "field",
  className,
}: SmartDispatchAgentProps) {
  return (
    <AmiRabahPanel
      needId={needId}
      settlementId={settlementId}
      scope={scope}
      className={className}
    />
  );
}
