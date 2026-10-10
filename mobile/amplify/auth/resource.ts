import { defineAuth } from '@aws-amplify/backend';

import { postConfirmation } from './post-confirmation/resource';

export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  userAttributes: {
    fullname: {
      required: true,
      mutable: true,
    },
  },
  groups: ['Admins', 'Clinicians', 'Patients'],
  triggers: {
    postConfirmation,
  },
  access: (allow) => [allow.resource(postConfirmation).to(['addUserToGroup'])],
});
