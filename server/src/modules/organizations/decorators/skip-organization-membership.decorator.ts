import { SetMetadata } from "@nestjs/common";

export const SKIP_ORGANIZATION_MEMBERSHIP_KEY = "skipOrganizationMembership";

export const SkipOrganizationMembership = () =>
  SetMetadata(SKIP_ORGANIZATION_MEMBERSHIP_KEY, true);
