export const roles = ['Admin', 'Clinician', 'Patient'] as const;

export type Role = (typeof roles)[number];

export type AuthenticatedUser = {
  email: string;
  name: string;
  role: Role;
};

/**
 * Staff roles are written to Clerk public metadata by a trusted admin process.
 * Accounts without a staff role are patients: public registration is patient-only.
 */
export function roleFromMetadata(metadata: unknown): Role {
  const role =
    typeof metadata === 'object' && metadata && 'role' in metadata
      ? String(metadata.role).toLowerCase()
      : '';

  if (role === 'admin') return 'Admin';
  if (role === 'clinician') return 'Clinician';
  return 'Patient';
}
