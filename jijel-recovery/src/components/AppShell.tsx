"use client";

import SosAlertButton from "@/components/emergency/SosAlertButton";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SosAlertButton />
    </>
  );
}
