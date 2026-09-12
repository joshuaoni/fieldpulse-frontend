/** The FieldPulse module role, or null when the user holds none. */
export type FieldRole = "FIELD_MANAGER" | "FIELD_REP";

export interface MyFieldRoleResponse {
  fieldRole: FieldRole | null;
}
