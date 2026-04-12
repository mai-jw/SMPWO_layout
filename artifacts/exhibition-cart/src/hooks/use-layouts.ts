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
export const LOCATIONS_QUERY_KEY = ["supabase-locations"];
export const CONFIG_LOCATIONS_ID = "CONFIG__LOCATIONS";

export const DEFAULT_LOCATIONS = [
  "梅田A", "梅田GG", "N広場", "N道頓堀", "N北東", "築港", "天保山", "天王寺駅南東", "天王寺駅北西", "ハルカス"
];

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
  
  // Support both new array format and legacy separate fields
  const shelves = Array.isArray(r.shelves) 
    ? r.shelves.map((s: unknown) => hydrateShelf(s))
    : [
        hydrateShelf(r.shelf1),
        hydrateShelf(r.shelf2),
        hydrateShelf(r.shelf3),
      ];

  return {
    poster: typeof r.poster === "string" ? r.poster : null,
    shelves: shelves as ShelfData[],
  };
}

export function useLayouts() {
  return useQuery({
    queryKey: LAYOUTS_QUERY_KEY,
    queryFn: async (): Promise<LayoutRecord[]> => {
      const { data, error } = await supabase
        .from(LAYOUTS_TABLE)
        .select("*")
        .neq("period", CONFIG_LOCATIONS_ID)
        .order("period", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? [])
        .map((row) => ({
          ...row,
          cart_a: hydrateLayout(row.cart_a),
          cart_b: hydrateLayout(row.cart_b),
        }))
        .sort((a, b) => {
          const regex = /^(\d{4})-(\d{2})-(前半|後半)(?:::(.+))?$/;
          const matchA = a.period.match(regex);
          const matchB = b.period.match(regex);
          if (matchA && matchB) {
            const [, yA, mA, hA, lA] = matchA;
            const [, yB, mB, hB, lB] = matchB;
            if (yB !== yA) return yB.localeCompare(yA);
            if (mB !== mA) return mB.localeCompare(mA);
            if (hA !== hB) return hA === "後半" ? -1 : 1;
            if (lA && !lB) return -1;
            if (!lA && lB) return 1;
            return (lA || "").localeCompare(lB || "", "ja");
          }
          return b.period.localeCompare(a.period, "ja");
        });
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

export function useDeleteLayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (period: string): Promise<void> => {
      const { error } = await supabase
        .from(LAYOUTS_TABLE)
        .delete()
        .eq("period", period);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LAYOUTS_QUERY_KEY }),
  });
}

export function useLocationsConfig() {
  return useQuery({
    queryKey: LOCATIONS_QUERY_KEY,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from(LAYOUTS_TABLE)
        .select("*")
        .eq("period", CONFIG_LOCATIONS_ID)
        .maybeSingle();
      
      if (error) throw new Error(error.message);
      
      if (data && data.cart_a && typeof data.cart_a.posterType === "string" && data.cart_a.posterType.length > 0) {
        try {
          const parsed = JSON.parse(data.cart_a.posterType);
          if (Array.isArray(parsed)) return parsed as string[];
        } catch(e) {
          console.warn("Failed to parse locations config, returning default", e);
        }
      }
      return DEFAULT_LOCATIONS;
    },
  });
}

export function useSaveLocationsConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (locations: string[]): Promise<void> => {
      const dummyCart = makeInitialCartLayoutV2();
      dummyCart.posterType = JSON.stringify(locations);
      
      const { error } = await supabase
        .from(LAYOUTS_TABLE)
        .upsert({ 
          period: CONFIG_LOCATIONS_ID, 
          cart_a: dummyCart, 
          cart_b: makeInitialCartLayoutV2(), 
          updated_at: new Date().toISOString() 
        }, { onConflict: "period" });
        
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LOCATIONS_QUERY_KEY }),
  });
}
