"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_USER_COOKIE } from "@acme/platform/auth";
import { platform } from "@/platform";

export async function signInAs(formData: FormData) {
  if (platform.identity.kind !== "demo") throw new Error("Demo sign-in is disabled");
  const userId = String(formData.get("userId") ?? "");
  (await cookies()).set(DEMO_USER_COOKIE, userId, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/apps");
}
