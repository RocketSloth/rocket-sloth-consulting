import type { Category, EvidenceKind } from "./types";

export const ROLES = ["customer", "company_owner", "admin"] as const;

/** Storage buckets. Photos are public (shown on reviews); receipts/docs are private. */
export const BUCKETS = {
  reviewPhotos: "review-photos",
  reviewReceipts: "review-receipts",
  applications: "applications",
  companyMedia: "company-media",
} as const;

/**
 * Evidence a customer must attach for a review to be valid. The owner chose
 * receipt/invoice + before & after photos, so all three are required.
 */
export const EVIDENCE_SPEC: Record<
  EvidenceKind,
  { label: string; help: string; bucket: string; isPublic: boolean; accept: string }
> = {
  receipt_invoice: {
    label: "Receipt or invoice",
    help: "Proof you actually hired and paid this company.",
    bucket: BUCKETS.reviewReceipts,
    isPublic: false,
    accept: "image/*,application/pdf",
  },
  before_photo: {
    label: "Before photo",
    help: "A photo taken before the work started.",
    bucket: BUCKETS.reviewPhotos,
    isPublic: true,
    accept: "image/*",
  },
  after_photo: {
    label: "After photo",
    help: "A photo of the completed work.",
    bucket: BUCKETS.reviewPhotos,
    isPublic: true,
    accept: "image/*",
  },
};

/** Every kind in EVIDENCE_SPEC is required for a valid review. */
export const REQUIRED_EVIDENCE_KINDS = Object.keys(EVIDENCE_SPEC) as EvidenceKind[];

/** Reference list of home & trade service categories (mirrors supabase/seed.sql). */
export const CATEGORY_SEED = [
  { slug: "plumbing", name: "Plumbing", icon: "🔧", description: "Pipes, leaks, water heaters, fixtures." },
  { slug: "electrical", name: "Electrical", icon: "⚡", description: "Wiring, panels, lighting, outlets." },
  { slug: "hvac", name: "Heating & Cooling", icon: "🌡️", description: "Furnaces, AC, heat pumps, ventilation." },
  { slug: "roofing", name: "Roofing", icon: "🏠", description: "Repairs, replacement, gutters." },
  { slug: "landscaping", name: "Landscaping & Lawn", icon: "🌿", description: "Lawn care, design, irrigation." },
  { slug: "cleaning", name: "House Cleaning", icon: "🧽", description: "Recurring, deep, and move-out cleans." },
  { slug: "painting", name: "Painting", icon: "🎨", description: "Interior and exterior painting." },
  { slug: "general-contracting", name: "General Contracting", icon: "🏗️", description: "Remodels and large projects." },
  { slug: "flooring", name: "Flooring", icon: "🪵", description: "Hardwood, tile, carpet, vinyl." },
  { slug: "pest-control", name: "Pest Control", icon: "🐜", description: "Inspection and extermination." },
  { slug: "handyman", name: "Handyman", icon: "🛠️", description: "Small repairs and odd jobs." },
  { slug: "appliance-repair", name: "Appliance Repair", icon: "🧰", description: "Washers, dryers, fridges, ovens." },
] as const;

/**
 * Launch focus: one tight area and a handful of categories first; expand once
 * they're filled. Referenced by the landing page and the resident signup form.
 */
export const LAUNCH_AREA = "Frisco, Little Elm & the Denton County area";

export const LAUNCH_CATEGORIES = [
  { slug: "roofing", name: "Roofing", icon: "🏠" },
  { slug: "plumbing", name: "Plumbing", icon: "🔧" },
  { slug: "hvac", name: "Heating & Cooling", icon: "🌡️" },
  { slug: "landscaping", name: "Lawn Care & Landscaping", icon: "🌿" },
  { slug: "cleaning", name: "House Cleaning", icon: "🧽" },
  { slug: "handyman", name: "Handyman", icon: "🛠️" },
] as const;

/**
 * Comprehensive business-type list for the early-access signup dropdown.
 * Broader than the directory's home-service categories — any local business can join.
 */
export const BUSINESS_TYPE_GROUPS: { group: string; types: string[] }[] = [
  {
    group: "Home & Trade Services",
    types: [
      "Plumbing", "Electrical", "Heating & Cooling (HVAC)", "Roofing",
      "Landscaping & Lawn Care", "House Cleaning", "Painting", "General Contracting",
      "Home Remodeling", "Flooring", "Pest Control", "Handyman", "Appliance Repair",
      "Pool Service", "Window Cleaning", "Carpet Cleaning", "Pressure Washing",
      "Tree Service", "Fencing", "Concrete & Masonry", "Garage Doors", "Solar",
      "Locksmith", "Moving & Storage", "Junk Removal", "Interior Design",
    ],
  },
  {
    group: "Automotive",
    types: [
      "Auto Repair / Mechanic", "Auto Detailing", "Auto Body & Collision",
      "Tires & Wheels", "Towing", "Car Wash", "Auto Sales",
    ],
  },
  {
    group: "Health & Medical",
    types: [
      "Dental", "Medical / Clinic", "Chiropractor", "Optometry", "Physical Therapy",
      "Mental Health / Therapy", "Home Health Care", "Senior Care", "Veterinary",
    ],
  },
  {
    group: "Beauty & Personal Care",
    types: [
      "Hair Salon", "Barber", "Nail Salon", "Spa & Massage", "Skincare / Esthetics",
      "Makeup Artist", "Tattoo & Piercing",
    ],
  },
  {
    group: "Fitness & Wellness",
    types: [
      "Gym", "Personal Training", "Yoga & Pilates", "Martial Arts", "Dance Studio",
      "Nutrition & Wellness Coaching",
    ],
  },
  {
    group: "Food & Drink",
    types: [
      "Restaurant", "Cafe / Coffee Shop", "Bakery", "Catering", "Food Truck",
      "Bar / Brewery", "Personal Chef",
    ],
  },
  {
    group: "Creative & Media",
    types: [
      "Photography", "Videography", "Graphic Design", "Web Design & Development",
      "Marketing & Advertising", "Printing & Signs", "DJ & Entertainment",
    ],
  },
  {
    group: "Professional Services",
    types: [
      "Accounting & Tax", "Bookkeeping", "Financial Advisor", "Insurance",
      "Legal / Attorney", "Real Estate Agent", "Mortgage / Lending", "Consulting",
      "IT Services / Computer Repair", "Notary",
    ],
  },
  {
    group: "Pets",
    types: ["Pet Grooming", "Dog Walking / Pet Sitting", "Pet Boarding & Daycare", "Dog Training"],
  },
  {
    group: "Events & Lifestyle",
    types: [
      "Event Planning", "Florist", "Wedding Services", "Travel Agency",
      "Tailoring & Alterations", "Dry Cleaning & Laundry",
    ],
  },
  {
    group: "Education & Childcare",
    types: ["Childcare / Daycare", "Tutoring", "Music Lessons", "Test Prep & Coaching"],
  },
  {
    group: "Retail & Shops",
    types: ["Retail Shop", "Boutique / Clothing", "Jewelry", "Furniture"],
  },
  { group: "Other", types: ["Other"] },
];

/** Seed categories shaped as full Category objects, for UI fallback before the DB is seeded. */
export function seedCategories(): Category[] {
  return CATEGORY_SEED.map((c, i) => ({
    id: c.slug,
    slug: c.slug,
    name: c.name,
    description: c.description,
    icon: c.icon,
    sort_order: i,
  }));
}
