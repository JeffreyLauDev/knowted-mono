// Forward declaration of Organizations type
export type OrganizationsType = {
  id: string;
  created_at: Date;
  name: string | null;
  api_token: string | null;
  website: string | null;
  company_analysis: string | null;
  company_type: string | null;
  team_size: string | null;
  business_description: string | null;
  business_offering: string | null;
  industry: string | null;
  target_audience: string | null;
  channels: string | null;
  owner_id: string;
  userOrganizations: IUserOrganization[];
};

export interface IUserOrganization {
  id: string;
  user_id: string;
  organization_id: string;
  role: string;
  organization: OrganizationsType;
}

export interface IOrganizations extends OrganizationsType {}

export type OrganizationWithUsers = IOrganizations;
export type UserOrganizationWithOrg = IUserOrganization;
