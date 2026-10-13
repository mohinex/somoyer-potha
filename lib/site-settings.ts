export type SiteSettings = {
  siteName: string;
  tagline: string;
  breakingText: string;
  categories: string[];
  aboutText: string;
  contactEmail: string;
};

export const defaultSiteSettings: SiteSettings = {
  siteName: "সময়ের পথ",
  tagline: "সময়ের সঙ্গে, সত্যের পথে",
  breakingText: "দেশজুড়ে নানা উদ্যোগে বদলে যাচ্ছে মানুষের জীবনযাত্রা • আজকের সব খবর পড়ুন এখানে",
  categories: ["বাংলাদেশ", "রাজনীতি", "বিশ্ব", "ব্যবসা", "মতামত", "খেলা", "বিনোদন", "চাকরি", "জীবনযাপন", "শিক্ষা", "প্রযুক্তি", "পরিবেশ"],
  aboutText: "সময়ের পথ — সময়ের সঙ্গে, সত্যের পথে।",
  contactEmail: "",
};

export function normalizeSiteSettings(value: unknown): SiteSettings {
  if (!value || typeof value !== "object") return defaultSiteSettings;
  const input = value as Partial<SiteSettings>;
  return {
    ...defaultSiteSettings,
    ...input,
    categories: Array.isArray(input.categories) && input.categories.length
      ? input.categories.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map(item => item.trim())
      : defaultSiteSettings.categories,
  };
}
