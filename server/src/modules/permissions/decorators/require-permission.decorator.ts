import { SetMetadata } from "@nestjs/common";

import { Request } from "express";

import { AccessLevel, ResourceType } from "../types/permissions.types";

export const PERMISSION_KEY = "permission";
export interface PermissionMetadata {
  resource: ResourceType;
  action: AccessLevel;
  getResourceId?: (request: Request) => string | null;
}

export const RequirePermission = (
  resource: ResourceType,
  action: AccessLevel,
  getResourceId?: (request: Request) => string | null,
) => SetMetadata(PERMISSION_KEY, { resource, action, getResourceId });
