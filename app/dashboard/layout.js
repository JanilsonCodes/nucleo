
import { Suspense } from "react";
import DashboardShell from "@/components/DashboardShell";

export default function Layout({ children }) {
  return (
    <Suspense fallback={<div>A carregar Núcleo...</div>}>
      <DashboardShell>
        {children}
      </DashboardShell>
    </Suspense>
  );
}
