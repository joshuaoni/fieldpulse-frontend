export const PAIR_SIZE = 2;

export interface PairUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive?: boolean;
  profileImageUrl: string | null;
}

export interface PairMembership {
  id: string;
  userId: string;
  startedAt: string;
  endedAt: string | null;
  user: PairUser;
}

export interface PairCurrentCall {
  visitId: string;
  leadId: string;
  companyName: string;
  address: string | null;
}

export interface PairStanding {
  date: string;
  current: PairCurrentCall | null;
  progress: { done: number; total: number };
  week: { done: number; total: number };
}

export interface SalesPair {
  id: string;
  name: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  members: PairMembership[];
  day: PairStanding;
}

export interface AssignableRep extends PairUser {
  fieldRole: "FIELD_MANAGER" | "FIELD_REP";
  pairId: string | null;
}

export const openMembers = (pair: SalesPair): PairMembership[] =>
  pair.members.filter((member) => !member.endedAt);

export const fullName = (user: PairUser): string => `${user.firstName} ${user.lastName}`.trim();

export function matchesRep(pair: SalesPair, term: string): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;

  return openMembers(pair).some((member) =>
    fullName(member.user).toLowerCase().includes(needle),
  );
}
