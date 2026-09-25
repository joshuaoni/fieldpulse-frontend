"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { MemberAvatars } from "@/components/ui/member-avatars";
import type { Visit } from "../types";
import { STATUS_LABEL, STATUS_TONE, driveLabel, repStatus } from "../week";

export function RouteCard({
  visit,
  position,
  selfId,
}: {
  visit: Visit;
  position: number;
  selfId: string | undefined;
}) {
  const drive = driveLabel(visit, position);
  const status = repStatus(visit, selfId);
  const partners = (visit.pair?.members ?? []).filter((member) => member.user.id !== selfId);

  return (
    <li>
      <Link
        href={`/visits/${visit.id}`}
        className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 hover:bg-sunken"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <MemberAvatars users={(visit.pair?.members ?? []).map((member) => member.user)} />
            <span className="truncate text-sm text-muted">
              You
              {partners.length
                ? ` & ${partners.map((member) => member.user.firstName).join(" & ")}`
                : ""}
            </span>
          </span>

          <span className="mt-1.5 flex items-start justify-between gap-3">
            <span className="min-w-0 truncate font-semibold">{visit.lead.companyName}</span>
            <span
              className={`shrink-0 rounded-md px-2 py-1 text-xs/none font-medium ${STATUS_TONE[status]}`}
            >
              {STATUS_LABEL[status]}
            </span>
          </span>

          <span className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-muted">
            {visit.lead.address && <span className="truncate">{visit.lead.address}</span>}
            {visit.lead.address && drive && <span aria-hidden>•</span>}
            {drive && <span className="shrink-0">{drive}</span>}
          </span>
        </span>

        <ChevronRight size={18} aria-hidden className="shrink-0 text-muted" />
      </Link>
    </li>
  );
}
