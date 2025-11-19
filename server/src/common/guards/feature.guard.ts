import { CanActivate, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

// Define FeatureType locally since we're removing plan-features
export enum FeatureType {
  // Basic features (Personal+)
  DATA_EXPORT = "data_export",
  CUSTOM_SUMMARIES = "custom_summaries",
  SPEAKER_RECOGNITION = "speaker_recognition",

  // Business features
  REAL_TIME_COACHING = "real_time_coaching",
  DEPARTMENT_REPORTS = "department_reports",
  API_WEBHOOKS = "api_webhooks",

  // Company features
  VIDEO_RECORDING = "video_recording",
  BRAND_VOICE = "brand_voice",
  CRM_INTEGRATION = "crm_integration",
  SSO = "sso",
  HIPAA = "hipaa",

  // Custom/Enterprise features
  MULTI_LANGUAGE = "multi_language",
  ADVANCED_ANALYTICS = "advanced_analytics",
  CUSTOM_BRANDING = "custom_branding",
  PRIORITY_SUPPORT = "priority_support",
}

export const FEATURE_KEY = "feature";
export const RequireFeature =
  (feature: FeatureType) =>
  (target: unknown, key?: string, descriptor?: PropertyDescriptor) => {
    Reflect.defineMetadata(FEATURE_KEY, feature, descriptor?.value ?? target);
  };

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(): Promise<boolean> {
    // Since we're not storing subscription plans in the database,
    // we'll allow all features for now
    // TODO: Implement feature checking based on Stripe subscription data if needed
    return true;
  }
}
