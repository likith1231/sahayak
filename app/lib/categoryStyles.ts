/**
 * Shared category visual system.
 * Used by CategoryBrowse tiles, listing filter chips, and card category banners.
 */

export interface CategoryStyle {
  /** Tailwind gradient classes (from-X to-Y) */
  gradient: string;
  /** Primary hex color for tints, borders, active states */
  color: string;
  /** Light tint hex for inactive chip backgrounds */
  tint: string;
  /** SVG icon identifier */
  icon: "leaf" | "apple" | "wheat" | "flame";
  /** Short description */
  description: string;
}

export const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  Vegetables: {
    gradient: "from-[#2D6A4F] to-[#40916C]",
    color: "#2D6A4F",
    tint: "#2D6A4F18",
    icon: "leaf",
    description: "Farm-fresh vegetables",
  },
  Fruits: {
    gradient: "from-[#E8913A] to-[#F6B352]",
    color: "#E8913A",
    tint: "#E8913A18",
    icon: "apple",
    description: "Seasonal fruits",
  },
  Grains: {
    gradient: "from-[#8B6F47] to-[#C4A265]",
    color: "#8B6F47",
    tint: "#8B6F4718",
    icon: "wheat",
    description: "Rice, wheat & millets",
  },
  Spices: {
    gradient: "from-[#C2432D] to-[#E86A50]",
    color: "#C2432D",
    tint: "#C2432D18",
    icon: "flame",
    description: "Aromatic spices",
  },
};

export const CATEGORY_NAMES = Object.keys(CATEGORY_STYLES);

/**
 * Get category style with fallback for unknown categories.
 */
export function getCategoryStyle(category: string | null | undefined): CategoryStyle {
  if (category && CATEGORY_STYLES[category]) {
    return CATEGORY_STYLES[category];
  }
  // Default fallback — primary green
  return {
    gradient: "from-[#2D6A4F] to-[#40916C]",
    color: "#2D6A4F",
    tint: "#2D6A4F18",
    icon: "leaf",
    description: "Fresh produce",
  };
}
