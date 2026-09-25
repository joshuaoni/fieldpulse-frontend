export interface PairMember {
  user: { id: string; firstName: string; lastName: string; profileImageUrl?: string | null };
}

export interface HasPair {
  pairId: string;
  pair?: { id: string; name: string | null; members?: PairMember[] };
}

export function pairLabel(record: HasPair): string {
  const name = record.pair?.name?.trim();
  if (name) return name;

  const members = (record.pair?.members ?? []).map((member) => member.user.firstName.trim());
  if (members.length) return members.join(" & ");

  return `Pair ${record.pairId.slice(0, 8)}`;
}
