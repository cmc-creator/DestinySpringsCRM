export const BRAND = {
  name:    process.env.NEXT_PUBLIC_ORG_NAME    ?? "Destiny Springs CRM",
  website: process.env.NEXT_PUBLIC_ORG_WEBSITE ?? "https://destinyspringshealthcare.com",
  email:   process.env.NEXT_PUBLIC_ORG_EMAIL   ?? "ops@destinyspringshealthcare.com",
  tagline: process.env.NEXT_PUBLIC_ORG_TAGLINE ?? "Behavioral Health CRM",
  year: "2026",
  legalEntity: "Destiny Springs Healthcare",
  copyright: "© 2026 Destiny Springs Healthcare. All rights reserved.",
} as const;

export const SERVER_BRAND = {
  name:    process.env.ORG_NAME    ?? process.env.NEXT_PUBLIC_ORG_NAME    ?? "Destiny Springs CRM",
  website: process.env.ORG_WEBSITE ?? process.env.NEXT_PUBLIC_ORG_WEBSITE ?? "https://destinyspringshealthcare.com",
  email:   process.env.ORG_EMAIL   ?? process.env.ADMIN_EMAIL              ?? "ops@destinyspringshealthcare.com",
} as const;
