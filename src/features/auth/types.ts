export interface ModuleRole {
  module: string;
  role: string;
  workstationIds?: string[];
}

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "STAFF" | "MANAGER" | "ADMIN" | "SUPERADMIN";
  isActive: boolean;
  jobTitle: string | null;
  profileImageUrl: string | null;
  department: { id: string; name: string; code: string } | null;
  moduleRoles?: ModuleRole[];
}
