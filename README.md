# Nutrix

Rutgers Health Hack 2026.

## Authentication

The Expo app in `mobile/` uses Clerk for email/password authentication and has three exclusive portal roles:

- `Patient` — public, self-service email/password registration.
- `Clinician` — invite-only account created by the Nutrix team.
- `Admin` — invite-only account created by the Nutrix team.

The Admin / Clinician / Patient selector is a portal check, not a way to choose access. An account that signs in through a different portal is immediately signed out and shown an authorization error.

### Mobile setup

1. In the Clerk Dashboard, enable **Native API** under **Native applications**.
2. Under **User & authentication**, enable **Email address**, **Password**, email-code verification, and first-name collection. First name is Nutrix's required display name.
3. Create `mobile/.env` locally (it is ignored by Git):

   ```env
   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   ```

4. Start the app:

   ```bash
   cd mobile
   npm ci
   npx expo start
   ```

Only the Clerk publishable key belongs in the Expo app. Never put `CLERK_SECRET_KEY` in a mobile build, an `.env` file that is committed, or any client-side code.

### Provision an Admin or Clinician

Before giving a staff member access:

1. Create or invite their Clerk user from a trusted team process.
2. Set `publicMetadata.role` to exactly `admin` or `clinician` using the Clerk Dashboard/Backend API. Never allow the mobile client to write this value.
3. Verify the user can only enter through the matching Nutrix portal tab.
4. Configure Clerk's session-token customization to add the role claim used by the AWS API. The AWS service must verify the Clerk JWT and authorize its role claim; it must not trust a role sent in a request body.

Publicly registered users have no staff role and are treated as `Patient`. That default is safe only while public registration remains patient-only.

## AWS ML pipeline

The ML pipeline can stay in AWS independently of Clerk. The Expo app sends the Clerk session token as `Authorization: Bearer <token>` to the AWS API. API Gateway/Lambda must verify its JWT signature, issuer, audience/authorized party, expiry, and role claim before invoking a pipeline or accessing data.
