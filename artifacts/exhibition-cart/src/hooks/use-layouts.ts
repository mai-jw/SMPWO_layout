import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  supabase,
  LAYOUTS_TABLE,
  makeInitialCartLayoutV2,
  makeDefaultShelf,
  type CartLayoutV2,
  type ShelfData,
  type LayoutRecord,
} from "@/lib/supabase";

export const LAYOUTS_QUERY_KEY = ["supabase-layouts"];

function hydrateShelf(raw: unknown): ShelfData {
  const def = makeDefaultShelf();
  if (!raw || typeof raw !== "object") return def;
  const r = raw as Record<string, unknown>;
  return {
    layout_type: (r.layout_type as ShelfData["layout_type"]) ?? def.layout_type,
    tag_1: (r.tag_1 as ShelfData["tag_1"]) ?? def.tag_1,
    tag_2: (r.tag_2 as ShelfData["tag_2"]) ?? def.tag_2,
    items: Array.isArray(r.items) ? (r.items as (string | null)[]) : def.items,
  };
}

function hydrateLayout(raw: unknown): CartLayoutV2 {
  const def = makeInitialCartLayoutV2();
  if (!raw || typeof raw !== "object") return def;
  const r = raw as Record<string, unknown>;
  return {
    poster: typeof r.poster === "string" ? r.poster : null,
    shelf1: hydrateShelf(r.shelf1),
    shelf2: hydrateShelf(r.shelf2),
    shelf3: hydrateShelf(r.shelf3),
  };
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
        cart_a: hydrateLayout(row.cart_a),
        cart_b: hydrateLayout(row.cart_b),
      }));
    },
  });
}

export function useSaveLayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ period, cart_a, cart_b }: { period: string; cart_a: CartLayoutV2; cart_b: CartLayoutV2 }): Promise<LayoutRecord> => {
      const { data, error } = await supabase
        .from(LAYOUTS_TABLE)
        .upsert({ period, cart_a, cart_b, updated_at: new Date().toISOString() }, { onConflict: "period" })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as LayoutRecord;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LAYOUTS_QUERY_KEY }),
  });
}
