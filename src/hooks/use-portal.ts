import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole, Profile } from "@/lib/portal";
import { getMyProfile, getMyAutomations, getMyOrders, getMyAccountContext } from "@/lib/client-platform.functions";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
    staleTime: 60_000,
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async (): Promise<Profile | null> => (await getMyProfile()) as Profile | null,
  });
}

export function useRole() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: async (): Promise<AppRole> => {
      const account = await getMyAccountContext();
      const role = String(account.role);
      if (role === "owner" || role === "admin" || account.isSuperAdmin) return "owner";
      if (role === "partner") return "partner";
      if (role === "verifier") return "verifier";
      return "client";
    },
  });
}

export function useInstances() {
  return useQuery({
    queryKey: ["instances"],
    queryFn: async () => getMyAutomations(),
  });
}

export function useMyPayments() {
  return useQuery({
    queryKey: ["my-orders"],
    queryFn: async () => getMyOrders(),
  });
}
