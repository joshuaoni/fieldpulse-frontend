"use client";

import { ReportsScreen } from "@/features/reports/components/reports-screen";
import { VisitDetailModal } from "@/features/visits/components/visit-detail-modal";

export function ManagerReportsScreen() {
  return (
    <ReportsScreen
      renderVisit={(visitId, onClose) => <VisitDetailModal visitId={visitId} onClose={onClose} />}
    />
  );
}
