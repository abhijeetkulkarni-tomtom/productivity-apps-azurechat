import { createHash } from "crypto";
import { getServerSession } from "next-auth";
import { RedirectToPage } from "../common/navigation-helpers";
import { options } from "./auth-api";
import { NextApiRequest, NextApiResponse } from 'next';
import fetch from 'node-fetch'; // Make sure to install node-fetch if you haven't

const clientId = process.env.AZURE_AD_CLIENT_ID ?? '';
const clientSecret = process.env.AZURE_AD_CLIENT_SECRET ?? '';
const tenantId = process.env.AZURE_AD_TENANT_ID ?? '';
//const clientId = process.env.EXTENSION_CLIENT_ID ?? '';
//const clientSecret = process.env.EXTENSION_CLIENT_SECRET ?? '';
//const tenantId = process.env.EXTENSION_TENANT_ID ?? '';  // Replace with your tenant ID
const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

export const getAccessToken = async () => async (): Promise<string | null> => {
/*  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('scope', 'https://graph.microsoft.com/.default');

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    body: params,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch access token');
  }

  const data = await response.json();
  return data.access_token;
*/
  const session = await getServerSession(options);
  if (session && session.accessToken) {
    return session.accessToken;
  }
  throw new Error('User not authenticated');
};

export const userSession = async (): Promise<UserModel | null> => {
  const session = await getServerSession(options);
  if (session && session.user) {
    return {
      name: session.user.name!,
      image: session.user.image!,
      email: session.user.email!,
      isAdmin: session.user.isAdmin!,
    };
  }

  return null;
};

export const getCurrentUser = async (): Promise<UserModel> => {
  const user = await userSession();
  if (user) {
    return user;
  }
  throw new Error("User not found");
};

export const userHashedId = async (): Promise<string> => {
  const user = await userSession();
  if (user) {
    return hashValue(user.email);
  }

  throw new Error("User not found");
};

export const hashValue = (value: string): string => {
  const hash = createHash("sha256");
  hash.update(value);
  return hash.digest("hex");
};

export const redirectIfAuthenticated = async () => {
  const user = await userSession();
  if (user) {
    RedirectToPage("chat");
  }
};

export type UserModel = {
  name: string;
  image: string;
  email: string;
  isAdmin: boolean;
};
