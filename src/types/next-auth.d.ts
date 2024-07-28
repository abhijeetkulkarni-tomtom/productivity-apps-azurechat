import { DefaultSession } from "next-auth";

// https://next-auth.js.org/getting-started/typescript#module-augmentation

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      isAdmin: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    isAdmin: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    isAdmin?: boolean;
  }
}
