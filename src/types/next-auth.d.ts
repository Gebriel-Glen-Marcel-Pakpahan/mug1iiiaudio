import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: "BUYER" | "ADMIN";
    };
  }
  interface User {
    role?: "BUYER" | "ADMIN";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: "BUYER" | "ADMIN";
  }
}
