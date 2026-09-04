"use client";

import SmartAssistantDrawer from "@/components/assistant/SmartAssistantDrawer";

type GlobalAgentDrawerProps = {
  open: boolean;
  onClose: () => void;
};

/** Map-level Ami Rabah drawer (wilaya scope). */
export default function GlobalAgentDrawer({
  open,
  onClose,
}: GlobalAgentDrawerProps) {
  return (
    <SmartAssistantDrawer open={open} onClose={onClose} scope="wilaya" />
  );
}
