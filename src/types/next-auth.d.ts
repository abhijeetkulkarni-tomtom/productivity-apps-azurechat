import { DefaultSession } from "next-auth";

// https://next-auth.js.org/getting-started/typescript#module-augmentation

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      isAdmin: boolean;
    } & DefaultSession["user"];
  }

  interface JWT {
    accessToken?: string;
    isAdmin?: boolean;
  }

  interface User {
    isAdmin: boolean;
  }
}
