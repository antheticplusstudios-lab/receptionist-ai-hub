import { createServerFn } from "@tanstack/react-start";
import { db2Admin } from "@/server/db/clients.server";

export type LivePlan = {
  slug: string;
  monthly_price: number;
  yearly_discount_pct: number;
  active: boolean;
  listed?: boolean;
};

export const getLivePricing = createServerFn({ method: "GET" }).handler(async (): Promise<LivePlan[]> => {
  const { data, error } = await db2Admin.from("pricing_plans").select("slug,monthly_price,yearly_discount_pct,active,listed").eq("active", true);
  if (error) throw new Error(error.message);
  return (data ?? []).map((p: any) => ({ ...p, monthly_price: Number(p.monthly_price), yearly_discount_pct: Number(p.yearly_discount_pct) }));
});
