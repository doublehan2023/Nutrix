# nutrix
Rutgers Health Hack 2026

## Authentication and staff access

The Expo application in `mobile/` uses Amplify Gen 2 and Amazon Cognito for Nutrix authentication. It has three mutually exclusive roles:

- `Patients` — users register themselves in the mobile app and are assigned to this group after they verify their email.
- `Clinicians` — invite-only accounts created by the Nutrix team.
- `Admins` — invite-only accounts for the Nutrix team.

### Run a development backend

From `mobile/`, authenticate the AWS CLI to the development account, then start the personal sandbox:

```bash
npx ampx sandbox
```

This provisions Cognito and writes `amplify_outputs.json`, which is intentionally ignored by Git because it is environment-specific. Restart Expo after the file is written.

### Provision an Admin or Clinician

1. Open the generated Cognito user pool in the AWS Console (or Amplify Console user management).
2. Create the user with their work email and require a password change at first sign-in.
3. Add the user to exactly one group: `Admins` or `Clinicians`. Do not add staff accounts to `Patients`.
4. Have the user use the matching Admin or Clinician role tab in Nutrix. A credential accepted under a different role tab is rejected and signed out.

The team must keep groups mutually exclusive. Group claims in the Cognito access token are the source of truth for authorization; the selected role tab only verifies that the user entered the intended portal.
