/**
 * Admin Layout — Server Component
 *
 * Auth check happens server-side so the admin HTML shell never ships
 * to unauthorized users. The actual admin UI (client component) is
 * rendered only after the server confirms authorization.
 */
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import AdminShell from "./AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/admin");
  }

  const role = (session.user as { role?: string })?.role;
  if (!["ADMINISTRATOR", "SUPER_ADMIN", "EDITOR"].includes(role || "")) {
    redirect("/");
  }

  return <AdminShell>{children}</AdminShell>;
}
