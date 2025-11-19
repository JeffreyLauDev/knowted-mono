import { MeetingTypeInterface } from "../../meeting_types/interfaces/meeting_type.interface";

export interface ReportTypesInterface {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  meeting_types: MeetingTypeInterface[];
  created_at: Date;
  updated_at: Date;
}
