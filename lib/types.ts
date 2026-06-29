export type Role = "customer" | "company_owner" | "admin";
export type CompanyStatus = "pending" | "approved" | "rejected" | "suspended";
export type ApplicationStatus = "pending" | "under_review" | "approved" | "rejected";
export type ReviewStatus = "pending" | "published" | "rejected";
export type EvidenceKind = "receipt_invoice" | "before_photo" | "after_photo";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  created_at: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
}

export interface Company {
  id: string;
  owner_id: string | null;
  slug: string;
  name: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address_line: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  service_area: string | null;
  license_number: string | null;
  years_in_business: number | null;
  logo_url: string | null;
  cover_url: string | null;
  status: CompanyStatus;
  rating_avg: number;
  rating_count: number;
  verified_at: string | null;
  created_at: string;
  categories?: Category[];
}

export interface CompanyApplication {
  id: string;
  company_id: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string | null;
  license_number: string | null;
  doc_paths: string[];
  status: ApplicationStatus;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  company?: Company;
}

export interface ReviewEvidence {
  id: string;
  review_id: string;
  kind: EvidenceKind;
  bucket: string;
  path: string;
  created_at: string;
  /** Resolved at read time — public URL for photos, signed URL for private receipts. */
  url?: string | null;
}

export interface Review {
  id: string;
  company_id: string;
  author_id: string | null;
  author_name: string;
  rating: number;
  title: string;
  body: string;
  job_type: string | null;
  job_cost: number | null;
  job_completed_on: string | null;
  status: ReviewStatus;
  verified_by: string | null;
  verified_at: string | null;
  admin_notes: string | null;
  created_at: string;
  evidence?: ReviewEvidence[];
  author?: Pick<Profile, "id" | "full_name">;
  company?: Pick<Company, "id" | "slug" | "name">;
}
