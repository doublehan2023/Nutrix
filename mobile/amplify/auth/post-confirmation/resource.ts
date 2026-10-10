import { defineFunction } from '@aws-amplify/backend';

export const postConfirmation = defineFunction({
  name: 'assign-patient-role',
  resourceGroupName: 'auth',
  environment: {
    GROUP_NAME: 'Patients',
  },
});
