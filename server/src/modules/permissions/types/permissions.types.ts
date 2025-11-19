// Generic resource types
export const GENERIC_RESOURCE_TYPES = [
  "reports",
  "permissions",
  "teams",
  "users",
  "billing",
  "calendar",
  "organization",
] as const;

// Specific resource types
export const SPECIFIC_RESOURCE_TYPES = [
  "meeting_types",
  "report_types",
] as const;

// Combined resource types
export const RESOURCE_TYPES = [
  ...GENERIC_RESOURCE_TYPES,
  ...SPECIFIC_RESOURCE_TYPES,
] as const;

export const ACCESS_LEVELS = ["none", "read", "readWrite"] as const;

// Type definitions
export type GenericResourceType = (typeof GENERIC_RESOURCE_TYPES)[number];
export type SpecificResourceType = (typeof SPECIFIC_RESOURCE_TYPES)[number];
export type ResourceType = (typeof RESOURCE_TYPES)[number];
export type AccessLevel = (typeof ACCESS_LEVELS)[number];
