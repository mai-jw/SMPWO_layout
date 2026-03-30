import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  supabase,
  LAYOUTS_TABLE,
  type CartLayout,
  type LayoutRecord,
  INITIAL_CART_LAYOUT,
  SLOT_IDS,
} from "@/lib/supabase";

export const LAYOUTS_QUERY_KEY = ["supabase-layouts"];

function hydrateLayout(raw: Record<string, unknown> | null | undefined): CartLayout {
  if (!raw) return { ...INITIAL_CART_LAYOUT };
  const result = { ...INITIAL_CART_LAYOUT };
  for (const slotId of SLOT_IDS) {
    const val = raw[slotId];
    result[slotId] = val && typeof val === "object" ? (val as CartLayout[typeof slotId]) : null;
  }
  return result;
}

export function useLayouts() {
  return useQuery({
    queryKey: LAYOUTS_QUERY_KEY,
    queryFn: async (): Promise<LayoutRecord[]> => {
      const { data, error } = await supabase
        .from(LAYOUTS_TABLE)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => ({
        ...row,
        cart_a: hydrateLayout(row.cart_a as Record<string, unknown>),
        cart_b: hydrateLayout(row.cart_b as Record<string, unknown>),
      }));
    },
  });
}

export function useSaveLayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      period,
      cart_a,
      cart_b,
    }: {
      period: string;
      cart_a: CartLayout;
      cart_b: CartLayout;
    }): Promise<LayoutRecord> => {
      const { data, error } = await supabase
        .from(LAYOUTS_TABLE)
        .upsert(
          { period, cart_a, cart_b, updated_at: new Date().toISOString() },
          { onConflict: "period" }
        )
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as LayoutRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LAYOUTS_QUERY_KEY });
    },
  });
}
