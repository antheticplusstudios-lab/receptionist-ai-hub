import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getDb } from "@/server/db/clients.server";

export type TenantContext = {
  userId: string;
  organizationId: string;
  clientId: string;
  role: string;
  email: string;
  isStaff: boolean;
  isPlatformAdmin: boolean;
  isSuperAdmin: boolean;
  isBanned: boolean;
  isSuspended: boolean;
  isMuted: boolean;
};

type Claims = Record<string, unknown>;

function authClient(token: string): SupabaseClient<any> {
  const url = process.env.DB1_URL;
  const anonKey = process.env.DB1_ANON_KEY ?? process.env.DB1_PUBLISHABLE_KEY;
  if (!url || !anonKey) throw new Error("DB1 auth environment is not configured");
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  }) as SupabaseClient<any>;
}

export async function resolveTenantContext(token: string, claims: Claims): Promise<TenantContext> {
  const userId = String(claims.sub ?? "");
  if (!userId) throw new Error("Unauthorized: no user id");

  const db1 = getDb("db1");
  const [profileRes, membershipRes, roleRes, restrictionRes] = await Promise.all([
    db1.from("profiles").select("id,email,default_organization_id").eq("id", userId).maybeSingle(),
    db1.from("organization_members").select("organization_id,role,is_active").eq("user_id", userId).eq("is_active", true).order("created_at", { ascending: true }).limit(1),
    db1.from("user_roles").select("role").eq("user_id", userId),
    db1.from("account_restrictions").select("status,muted").eq("user_id", userId).maybeSingle(),
  ]);

  const profile = profileRes.data;
  const membership = membershipRes.data?.[0] ?? null;
  const roles = new Set<string>((roleRes.data ?? []).map((r: any) => String(r.role)));
  const restriction = restrictionRes.data ?? { status: "active", muted: false };
  const organizationId = String(profile?.default_organization_id ?? membership?.organization_id ?? "");
  if (!organizationId) throw new Error("Account is missing an organization");

  const isPlatformAdmin = ["owner", "admin", "partner"].some((role) => roles.has(role));
  const isStaff = isPlatformAdmin || roles.has("verifier") || roles.has("staff");
  const isSuperAdmin = roles.has("owner") || roles.has("admin");

  return {
    userId,
    organizationId,
    clientId: organizationId,
    role: String(membership?.role ?? Array.from(roles)[0] ?? "member"),
    email: String(profile?.email ?? claims.email ?? ""),
    isStaff,
    isPlatformAdmin,
    isSuperAdmin,
    isBanned: String(restriction.status) === "banned",
    isSuspended: String(restriction.status) === "suspended",
    isMuted: Boolean(restriction.muted),
  };
}

export function assertTenantActive(ctx: TenantContext) {
  if (ctx.isBanned) throw new Response("Forbidden: account is banned", { status: 403 });
  if (ctx.isSuspended) throw new Response("Forbidden: account is suspended", { status: 403 });
}
