import {
  AdminAddUserToGroupCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import type { PostConfirmationTriggerHandler } from 'aws-lambda';

const cognito = new CognitoIdentityProviderClient({});

/** Assign public, confirmed sign-ups to the only self-service role. */
export const handler: PostConfirmationTriggerHandler = async (event) => {
  if (event.triggerSource !== 'PostConfirmation_ConfirmSignUp') {
    return event;
  }

  await cognito.send(
    new AdminAddUserToGroupCommand({
      GroupName: process.env.GROUP_NAME ?? 'Patients',
      UserPoolId: event.userPoolId,
      Username: event.userName,
    }),
  );

  return event;
};
