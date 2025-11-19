import { Organizations } from "../../organizations/entities/organizations.entity";

export interface MeetingTypeInterface {
  id: string;
  name?: string;
  description: string;
  analysis_metadata_structure?: Record<string, string> | null;
  organization_id: string;
  organization: Organizations;
  created_at: Date;
  updated_at: Date;
}
