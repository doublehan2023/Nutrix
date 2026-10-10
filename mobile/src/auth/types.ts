export const roles = ['Admin', 'Clinician', 'Patient'] as const;

export type Role = (typeof roles)[number];

export type AuthenticatedUser = {
  email: string;
  name: string;
  role: Role;
};

export const roleGroup: Record<Role, string> = {
  Admin: 'Admins',
  Clinician: 'Clinicians',
  Patient: 'Patients',
};

export function roleFromGroups(groups: readonly string[]): Role | null {
  const matchedRoles = roles.filter((role) => groups.includes(roleGroup[role]));
  return matchedRoles.length === 1 ? matchedRoles[0] : null;
}
