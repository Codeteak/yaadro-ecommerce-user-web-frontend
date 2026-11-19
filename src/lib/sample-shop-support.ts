/**
 * Sample shop contact for Help & Support (#15) playground.
 * Replace with live shop address/phone when the API exposes them.
 */
export type ShopSupportContact = {
  shopName: string;
  phone: string;
  /** tel: href digits, e.g. +918045678901 */
  phoneTel: string;
  /** WhatsApp wa.me digits without + */
  whatsappNumber: string;
  addressLines: string[];
  /** Optional maps / directions URL */
  mapsHref?: string;
};

export const SAMPLE_SHOP_SUPPORT: ShopSupportContact = {
  shopName: "Green Basket",
  phone: "+91 80 4567 8901",
  phoneTel: "+918045678901",
  whatsappNumber: "918045678901",
  addressLines: [
    "12, Amaryllis Ground Floor",
    "Begur Main Road, Bengaluru 560114",
  ],
  mapsHref: "https://maps.google.com/?q=Begur+Bengaluru",
};
