import type { CategoryBranch } from "@/lib/api/storefront";

/**
 * Home “shop by aisle” browse blocks (Blinkit-style section + square tiles).
 * Sample data is for playground reconstruct; live home will pass `branches`.
 */

export type CategoryBrowseTile = {
  id: string;
  name: string;
  slug: string;
  image: string;
};

export type CategoryBrowseSection = {
  id: string;
  title: string;
  tiles: CategoryBrowseTile[];
};

/** Roots that already have the dedicated FruitsVeggies band on home. */
export const PRODUCE_BROWSE_SLUGS = new Set(["fruits", "vegetables"]);

function tile(
  id: string,
  name: string,
  image: string,
  slug = id,
): CategoryBrowseTile {
  return { id, name, slug, image };
}

/**
 * Rich sample sections for playground — mirrors the reference layout
 * (Grocery / Beauty / Health). Images reuse existing product assets.
 */
export const SAMPLE_CATEGORY_BROWSE_SECTIONS: CategoryBrowseSection[] = [
  {
    id: "grocery",
    title: "Grocery",
    tiles: [
      tile("atta", "Atta, Flours and Sooji", "/products/pasta.jpg"),
      tile("chocolates", "Chocolates and Biscuits", "/products/nuts.jpg"),
      tile("dals", "Dals and Pulses", "/products/cornflakes.jpg"),
      tile("soft-drinks", "Energy and Soft Drinks", "/products/sprite.jpg"),
      tile("bakery-dairy", "Bakery, Cakes & Dairy", "/products/cheese.jpg"),
      tile("cooking", "Cooking and Baking Needs", "/products/jug.jpg"),
      tile("detergents", "Detergents and Dishwash", "/products/herbs.jpg"),
      tile("frozen-snacks", "Frozen Snacks", "/products/chips-close.jpg"),
      tile("cereals", "Cereals and Breakfast", "/products/cornflakes.jpg"),
      tile("dairy-cheese", "Dairy and Cheese", "/products/milk.jpg"),
      tile("eggs-meat", "Eggs, Meat & Fish", "/products/garlic-bread.jpg"),
      tile("frozen-veg", "Frozen Vegetables", "/products/broccoli.jpg"),
    ],
  },
  {
    id: "beauty",
    title: "Beauty & Personal Care",
    tiles: [
      tile("bath-soaps", "Bath Soaps and Gels", "/products/fanta.jpg"),
      tile("body-care", "Body Care - Loofah and Other Tools", "/products/peppers.jpg"),
      tile("grooming", "Grooming Tools and Accessories", "/products/baguette.jpg"),
      tile("hair-oils", "Hair Oils, Care, and Styling", "/products/cola-can.jpg"),
      tile("hair-dryer", "Hair Dryer", "/products/jug.jpg"),
      tile("fragrance", "Fragrance", "/products/oranges.jpg"),
    ],
  },
  {
    id: "health",
    title: "Health & Wellness",
    tiles: [
      tile("ayurvedic", "Ayurvedic", "/products/herbs.jpg"),
      tile("baby-rash", "Baby Care - Rash Creams", "/products/cornflakes.jpg"),
      tile("cold-cough", "Cold and Cough", "/products/milk.jpg"),
      tile("diabetes", "Diabetes Control", "/products/green-apples.jpg"),
      tile("baby-care", "Baby Care", "/products/bananas.jpg"),
      tile("baby-wipes", "Baby Care - Wipes and Buds", "/products/tomatoes.jpg"),
      tile("contraceptives", "Contraceptives", "/products/pasta.jpg"),
      tile("elder-care", "Elder Care", "/products/cheese.jpg"),
      tile("diapers", "Baby Care - Diapers and Accessories", "/products/chips-close.jpg"),
      tile("breathe", "Breathe Easy", "/products/sprite.jpg"),
      tile("covid", "Covid Essentials", "/products/nuts.jpg"),
      tile("ent", "ENT Care", "/products/broccoli.jpg"),
    ],
  },
  {
    id: "home-kitchen",
    title: "Home & Kitchen",
    tiles: [
      tile("batteries", "Duracell Batteries", "/products/cola-can.jpg"),
      tile("cleaning", "Cleaning Essentials", "/products/herbs.jpg"),
      tile("kitchen", "Kitchen Tools", "/products/pasta.jpg"),
      tile("storage", "Storage & Containers", "/products/jug.jpg"),
    ],
  },
];

/**
 * Map live (or sample) category branches into browse sections.
 * Parents with children → section of child tiles.
 * Leaf roots → one tile under their own title.
 * Skips produce roots that already appear in FruitsVeggiesSection.
 */
export function browseSectionsFromBranches(
  branches: CategoryBranch[],
  options?: { excludeSlugs?: Iterable<string> },
): CategoryBrowseSection[] {
  const exclude = new Set(
    options?.excludeSlugs ?? PRODUCE_BROWSE_SLUGS,
  );
  const sections: CategoryBrowseSection[] = [];

  for (const branch of branches) {
    if (exclude.has(branch.slug)) continue;

    if (branch.children.length > 0) {
      sections.push({
        id: branch.id,
        title: branch.name,
        tiles: branch.children.map((child) => ({
          id: child.id,
          name: child.name,
          slug: child.slug,
          image: child.image,
        })),
      });
      continue;
    }

    sections.push({
      id: branch.id,
      title: branch.name,
      tiles: [
        {
          id: branch.id,
          name: branch.name,
          slug: branch.slug,
          image: branch.image,
        },
      ],
    });
  }

  return sections;
}
