"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "./AuthProvider";
import { InstallProvider } from "./InstallProvider";
import { PlanProvider } from "./PlanProvider";
import { ToastViewport } from "@/components/ui/Toast";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import ServiceWorkerRegister from "@/components/pwa/ServiceWorkerRegister";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <PlanProvider>
        <InstallProvider>
          {children}
          <ToastViewport />
          <InstallPrompt />
          <ServiceWorkerRegister />
        </InstallProvider>
      </PlanProvider>
    </AuthProvider>
  );
}
