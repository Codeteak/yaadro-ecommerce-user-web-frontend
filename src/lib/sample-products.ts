import type { HomeCategory } from "@/lib/home-categories";

/**
 * ⚠️ SAMPLE DATA — UI development only.
 *
 * These products, prices and badges are placeholders so the product
 * card UI can be built and reviewed. They are NOT real catalog data:
 * no prices, discounts or availability should be treated as actual
 * shop offers. Replace this whole file with the real catalog API
 * response when the backend contract is available.
 */
/**
 * Mirrors the backend's per-product custom option: products that have
 * it open the customizer (weight ruler) instead of the plain stepper.
 * When the catalog API lands, this flag comes from the product payload.
 * For weight products, `price`/`mrp` are PER KG.
 */
export type WeightCustomization = {
  type: "weight";
  stepKg: number;
  minKg: number;
  maxKg: number;
};

export type SampleProductRating = {
  value: number;
  count: number;
};

export type SampleProduct = {
  id: string;
  category: HomeCategory;
  name: string;
  unit: string;
  price: number;
  mrp: number;
  badge?: string;
  image: string;
  /** Extra gallery shots. Falls back to `[image]` when omitted. */
  images?: string[];
  /** Short PDP blurb — omit when the catalog has none. */
  description?: string;
  /** Ingredient list for packaged goods — omit when N/A. */
  ingredients?: string;
  rating?: SampleProductRating;
  customization?: WeightCustomization;
};

/** Gallery sources for a product (primary + extras). */
export function productImages(product: SampleProduct): string[] {
  if (product.images && product.images.length > 0) return product.images;
  return [product.image];
}

/**
 * PDP description as the catalog API would resolve it: product copy
 * first, then category defaults for loose fruit / veg (demo stand-in).
 */
export function resolveProductDescription(
  product: SampleProduct,
): string | undefined {
  if (product.description?.trim()) return product.description.trim();
  if (product.category === "Fruits") {
    return "Fresh fruits, carefully selected and ready to enjoy.";
  }
  if (product.category === "Vegetables") {
    return "Fresh veggies, farm-picked and great for everyday cooking.";
  }
  return undefined;
}

const BY_WEIGHT: WeightCustomization = { type: "weight", stepKg: 0.5, minKg: 0.5, maxKg: 10 };

export const SAMPLE_PRODUCTS: SampleProduct[] = [
  // Fruits (loose fruit is sold by weight — custom option, price per kg)
  {
    id: "fr-1",
    category: "Fruits",
    name: "Fresh Robusta Bananas",
    unit: "per kg",
    price: 72,
    mrp: 90,
    badge: "Best Seller",
    image: "/products/bananas.jpg",
    images: [
      "/products/bananas.jpg",
      "/categories/fruits.jpg",
      "/products/oranges.jpg",
      "/products/green-apples.jpg",
    ],
    description:
      "Naturally ripened Robusta bananas — sweet, firm, and ready for breakfast or a snack.",
    rating: { value: 4.7, count: 186 },
    customization: BY_WEIGHT,
  },
  { id: "fr-2", category: "Fruits", name: "Nagpur Oranges", unit: "per kg", price: 120, mrp: 150, image: "/products/oranges.jpg", customization: BY_WEIGHT },
  { id: "fr-3", category: "Fruits", name: "Green Apples", unit: "per kg", price: 220, mrp: 270, image: "/products/green-apples.jpg", customization: BY_WEIGHT },
  {
    id: "fr-4",
    category: "Fruits",
    name: "Seasonal Fruit Mix",
    unit: "1 kg pack",
    price: 199,
    mrp: 249,
    image: "/categories/fruits.jpg",
    images: [
      "/categories/fruits.jpg",
      "/products/bananas.jpg",
      "/products/oranges.jpg",
      "/products/green-apples.jpg",
    ],
    description:
      "A ready-to-eat mix of seasonal fruits, washed and packed for convenience.",
    ingredients: "Banana, orange, apple, seasonal melon (varies by harvest).",
    rating: { value: 4.5, count: 92 },
  },

  // Vegetables (loose vegetables by weight — custom option, price per kg)
  { id: "vg-1", category: "Vegetables", name: "Fresh Broccoli", unit: "per kg", price: 110, mrp: 140, image: "/products/broccoli.jpg", customization: BY_WEIGHT },
  { id: "vg-2", category: "Vegetables", name: "Bell Peppers Trio", unit: "per kg", price: 178, mrp: 220, badge: "Best Seller", image: "/products/peppers.jpg", customization: BY_WEIGHT },
  {
    id: "vg-3",
    category: "Vegetables",
    name: "Farm Tomatoes",
    unit: "per kg",
    price: 42,
    mrp: 60,
    image: "/products/tomatoes.jpg",
    images: [
      "/products/tomatoes.jpg",
      "/categories/vegetables.jpg",
      "/products/peppers.jpg",
      "/products/broccoli.jpg",
    ],
    description:
      "Vine-ripened farm tomatoes — juicy, bright, and ideal for salads or curry.",
    rating: { value: 4.8, count: 230 },
    customization: BY_WEIGHT,
  },
  {
    id: "vg-4",
    category: "Vegetables",
    name: "Fresh Coriander Bunch",
    unit: "100 g",
    price: 15,
    mrp: 20,
    image: "/products/herbs.jpg",
    description: "Fragrant coriander leaves, washed and bunched for daily cooking.",
    ingredients: "Fresh coriander (coriander leaves).",
  },

  // Bakery
  {
    id: "bk-1",
    category: "Bakery",
    name: "Sourdough Loaf",
    unit: "400 g",
    price: 95,
    mrp: 120,
    badge: "Best Seller",
    image: "/categories/bakery.jpg",
    description: "Artisan sourdough with a crisp crust and soft, tangy crumb.",
    ingredients: "Wheat flour, water, sourdough starter, salt.",
  },
  {
    id: "bk-2",
    category: "Bakery",
    name: "French Baguette",
    unit: "300 g",
    price: 75,
    mrp: 90,
    image: "/products/baguette.jpg",
    description: "Classic baguette — golden crust, airy interior, best same day.",
    ingredients: "Wheat flour, water, yeast, salt.",
  },
  {
    id: "bk-3",
    category: "Bakery",
    name: "Corn Flakes Cereal",
    unit: "500 g",
    price: 185,
    mrp: 220,
    image: "/products/cornflakes.jpg",
    description: "Light, crispy corn flakes for a quick breakfast bowl.",
    ingredients: "Maize, sugar, malt extract, salt. May contain gluten.",
  },
  {
    id: "bk-4",
    category: "Bakery",
    name: "Garlic Bread Stick",
    unit: "250 g",
    price: 85,
    mrp: 99,
    image: "/products/garlic-bread.jpg",
    description: "Soft bread sticks brushed with garlic butter — ready to warm.",
    ingredients: "Wheat flour, butter, garlic, salt, yeast, herbs.",
  },

  // Dairy & Eggs
  {
    id: "de-1",
    category: "Dairy & Eggs",
    name: "Farm Eggs Tray",
    unit: "12 pcs",
    price: 84,
    mrp: 105,
    badge: "Best Seller",
    image: "/categories/dairy-eggs.jpg",
    description: "Farm-fresh eggs, packed as a dozen for everyday cooking.",
    ingredients: "Hen eggs.",
  },
  {
    id: "de-2",
    category: "Dairy & Eggs",
    name: "Full Cream Milk",
    unit: "500 ml",
    price: 32,
    mrp: 36,
    image: "/products/milk.jpg",
    description: "Full cream milk — rich taste for tea, coffee, and cereal.",
    ingredients: "Cow milk.",
  },
  {
    id: "de-3",
    category: "Dairy & Eggs",
    name: "Cheese Block",
    unit: "200 g",
    price: 145,
    mrp: 170,
    image: "/products/cheese.jpg",
    description: "Mild cheese block — slice for sandwiches or grate for cooking.",
    ingredients: "Milk, salt, microbial rennet, starter culture.",
  },
  {
    id: "de-4",
    category: "Dairy & Eggs",
    name: "Milk & Eggs Breakfast Combo",
    unit: "1 pack",
    price: 149,
    mrp: 185,
    image: "/products/jug.jpg",
    description: "Handy breakfast pack with milk and eggs for the week start.",
    ingredients: "Full cream milk, hen eggs.",
  },

  // Beverages
  {
    id: "bv-1",
    category: "Beverages",
    name: "Coca-Cola",
    unit: "750 ml",
    price: 40,
    mrp: 45,
    image: "/categories/beverages.jpg",
    description: "Chilled classic cola — crisp and refreshing.",
    ingredients:
      "Carbonated water, sugar, caramel colour, phosphoric acid, natural flavours, caffeine.",
  },
  {
    id: "bv-2",
    category: "Beverages",
    name: "Sprite",
    unit: "750 ml",
    price: 40,
    mrp: 45,
    image: "/products/sprite.jpg",
    description: "Lemon-lime soda with a clean, sparkling finish.",
    ingredients:
      "Carbonated water, sugar, acidity regulators, natural lemon-lime flavours.",
  },
  {
    id: "bv-3",
    category: "Beverages",
    name: "Fanta Orange",
    unit: "750 ml",
    price: 40,
    mrp: 45,
    badge: "Best Seller",
    image: "/products/fanta.jpg",
    description: "Bright orange flavour soda for a fruity refresh.",
    ingredients:
      "Carbonated water, sugar, orange juice from concentrate, acidity regulators, natural flavours, colours.",
  },
  {
    id: "bv-4",
    category: "Beverages",
    name: "Coca-Cola Can",
    unit: "300 ml",
    price: 35,
    mrp: 40,
    image: "/products/cola-can.jpg",
    description: "Classic cola in a handy single-serve can.",
    ingredients:
      "Carbonated water, sugar, caramel colour, phosphoric acid, natural flavours, caffeine.",
  },

  // Snacks
  {
    id: "sn-1",
    category: "Snacks",
    name: "Potato Chips",
    unit: "150 g",
    price: 60,
    mrp: 80,
    badge: "Best Seller",
    image: "/categories/snacks.jpg",
    description: "Crispy salted potato chips — open and share.",
    ingredients: "Potato, edible vegetable oil, salt.",
  },
  {
    id: "sn-2",
    category: "Snacks",
    name: "Instant Pasta",
    unit: "400 g",
    price: 99,
    mrp: 130,
    image: "/products/pasta.jpg",
    description: "Quick-cook pasta for an easy weeknight meal.",
    ingredients: "Durum wheat semolina. May contain traces of egg.",
  },
  {
    id: "sn-3",
    category: "Snacks",
    name: "Trail Mix Dry Fruits",
    unit: "250 g",
    price: 299,
    mrp: 399,
    image: "/products/nuts.jpg",
    images: ["/products/nuts.jpg", "/products/chips-close.jpg", "/categories/snacks.jpg"],
    description:
      "A crunchy mix of roasted nuts and dried fruit for an anytime energy boost.",
    ingredients:
      "Almonds, cashews, raisins, dried cranberries, pumpkin seeds. May contain traces of peanuts.",
    rating: { value: 4.6, count: 141 },
  },
  {
    id: "sn-4",
    category: "Snacks",
    name: "Masala Chips",
    unit: "150 g",
    price: 55,
    mrp: 70,
    image: "/products/chips-close.jpg",
    description: "Spiced masala chips with a tangy crunch.",
    ingredients: "Potato, edible vegetable oil, salt, spice mix (chilli, cumin, mango powder).",
  },
];

export function getProductsByCategory(category: HomeCategory): SampleProduct[] {
  return SAMPLE_PRODUCTS.filter((p) => p.category === category);
}

export function getSampleProduct(id: string): SampleProduct | undefined {
  return SAMPLE_PRODUCTS.find((p) => p.id === id);
}

/**
 * Local product search for categories hub (sample data until catalog API).
 * Matches name, category, unit, and optional description.
 */
export function searchSampleProducts(query: string): SampleProduct[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return SAMPLE_PRODUCTS.filter((p) => {
    if (p.name.toLowerCase().includes(q)) return true;
    if (p.category.toLowerCase().includes(q)) return true;
    if (p.unit.toLowerCase().includes(q)) return true;
    if (p.description?.toLowerCase().includes(q)) return true;
    if (p.badge?.toLowerCase().includes(q)) return true;
    return false;
  });
}
