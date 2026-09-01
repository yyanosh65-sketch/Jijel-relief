"use client";

import SosAlertButton from "@/components/emergency/SosAlertButton";
import RegisterConvoyButton from "@/components/convoys/RegisterConvoyButton";
import RegisterHelperButton from "@/components/helpers/RegisterHelperButton";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div
        dir="rtl"
        className="pointer-events-none fixed inset-x-0 top-0 z-[2900] flex justify-end p-3"
      >
        <div className="pointer-events-auto flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <RegisterConvoyButton variant="navbar" />
          <RegisterHelperButton variant="navbar" />
        </div>
      </div>
      {children}
      <SosAlertButton />
    </>
  );
}
