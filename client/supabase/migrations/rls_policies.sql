-- Enable Row Level Security on all tables
ALTER TABLE public.ai_conversation_histories ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_conversation_histories;
ALTER TABLE public.ai_conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_type_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_type_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_types ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can view their own AI conversation histories"
ON public.ai_conversation_histories
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM ai_conversation_sessions s
        WHERE s.id = ai_conversation_histories.session_id
        AND s.profile_id = auth.uid()
    )
);

CREATE POLICY "Users can view their own AI conversation sessions"
ON public.ai_conversation_sessions
FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

CREATE POLICY "Users can insert their own AI conversation histories"
ON public.ai_conversation_histories
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM ai_conversation_sessions s
        WHERE s.id = ai_conversation_histories.session_id
        AND s.profile_id = auth.uid()
    )
);

CREATE POLICY "Organization members can view their organization details"
ON public.organizations
FOR SELECT
TO authenticated
USING (is_organization_member(auth.uid(), id));

CREATE POLICY "Users can view their own organization memberships"
ON public.organization_members
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Organization members can view teams in their organizations"
ON public.teams
FOR SELECT
TO authenticated
USING (is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Users can view meeting types based on their team permissions"
ON public.meeting_types
FOR SELECT
TO authenticated
USING (has_meeting_type_access(auth.uid(), id));

CREATE POLICY "Users can view permission groups for their teams"
ON public.permission_groups
FOR SELECT
TO authenticated
USING (has_team_permission_group(auth.uid(), team_id));

CREATE POLICY "Users can view meeting type permissions for their teams"
ON public.meeting_type_permissions
FOR SELECT
TO authenticated
USING (
    permission_group_id IN (
        SELECT pg.id
        FROM permission_groups pg
        WHERE has_team_permission_group(auth.uid(), pg.team_id)
    )
);

CREATE POLICY "Users can view meetings based on their team permissions"
ON public.meetings
FOR SELECT
TO authenticated
USING (has_meeting_type_access(auth.uid(), meeting_type_id));

CREATE POLICY "Users can view reports based on their team permissions"
ON public.reports
FOR SELECT
TO authenticated
USING (has_report_type_access(auth.uid(), report_type_id));

CREATE POLICY "Users can view report type permissions for their teams"
ON public.report_type_permissions
FOR SELECT
TO authenticated
USING (
    permission_group_id IN (
        SELECT pg.id
        FROM permission_groups pg
        WHERE has_team_permission_group(auth.uid(), pg.team_id)
    )
);

CREATE POLICY "Users can view report types based on their team permissions"
ON public.report_types
FOR SELECT
TO authenticated
USING (has_report_type_access(auth.uid(), id));







--------------- AI GENERATED




-- Write Policies for Organizations
CREATE POLICY "Users can manage organization details if they have write permission"
ON public.organizations
FOR ALL
TO authenticated
USING (
    can_write_organization_details(auth.uid(), id)
)
WITH CHECK (
    can_write_organization_details(auth.uid(), id)
);

-- Write Policies for Teams
CREATE POLICY "Users can manage teams if they have write permission"
ON public.teams
FOR ALL
TO authenticated
USING (
    can_write_teams(auth.uid(), organization_id)
)
WITH CHECK (
    can_write_teams(auth.uid(), organization_id)
);

-- Write Policies for Permission Groups
CREATE POLICY "Users can manage permission groups if they have write permission"
ON public.permission_groups
FOR ALL
TO authenticated
USING (
    can_write_permission_groups(auth.uid(), (
        SELECT organization_id FROM teams WHERE id = team_id
    ))
)
WITH CHECK (
    can_write_permission_groups(auth.uid(), (
        SELECT organization_id FROM teams WHERE id = team_id
    ))
);

-- Write Policies for Meeting Types
CREATE POLICY "Users can manage meeting types if they have write permission"
ON public.meeting_types
FOR ALL
TO authenticated
USING (
    can_write_meeting_types(auth.uid(), (
        SELECT organization_id FROM teams WHERE id = team_id
    ))
)
WITH CHECK (
    can_write_meeting_types(auth.uid(), (
        SELECT organization_id FROM teams WHERE id = team_id
    ))
);

-- Write Policies for Meeting Type Permissions
CREATE POLICY "Users can manage meeting type permissions if they have write permission"
ON public.meeting_type_permissions
FOR ALL
TO authenticated
USING (
    permission_group_id IN (
        SELECT pg.id
        FROM permission_groups pg
        JOIN teams t ON pg.team_id = t.id
        WHERE can_write_permission_groups(auth.uid(), t.organization_id)
    )
)
WITH CHECK (
    permission_group_id IN (
        SELECT pg.id
        FROM permission_groups pg
        JOIN teams t ON pg.team_id = t.id
        WHERE can_write_permission_groups(auth.uid(), t.organization_id)
    )
);

-- Write Policies for Report Types
CREATE POLICY "Users can manage report types if they have write permission"
ON public.report_types
FOR ALL
TO authenticated
USING (
    can_write_report_types(auth.uid(), (
        SELECT organization_id FROM teams WHERE id = team_id
    ))
)
WITH CHECK (
    can_write_report_types(auth.uid(), (
        SELECT organization_id FROM teams WHERE id = team_id
    ))
);

-- Write Policies for Report Type Permissions
CREATE POLICY "Users can manage report type permissions if they have write permission"
ON public.report_type_permissions
FOR ALL
TO authenticated
USING (
    permission_group_id IN (
        SELECT pg.id
        FROM permission_groups pg
        JOIN teams t ON pg.team_id = t.id
        WHERE can_write_permission_groups(auth.uid(), t.organization_id)
    )
)
WITH CHECK (
    permission_group_id IN (
        SELECT pg.id
        FROM permission_groups pg
        JOIN teams t ON pg.team_id = t.id
        WHERE can_write_permission_groups(auth.uid(), t.organization_id)
    )
);

-- Write Policies for Meetings
CREATE POLICY "Users can manage meetings if they have write permission"
ON public.meetings
FOR ALL
TO authenticated
USING (
    can_write_meeting_types(auth.uid(), meeting_type_id)
)
WITH CHECK (
    can_write_meeting_types(auth.uid(), meeting_type_id)
);

-- Write Policies for Reports
CREATE POLICY "Users can manage reports if they have write permission"
ON public.reports
FOR ALL
TO authenticated
USING (
    can_write_report_types(auth.uid(), report_type_id)
)
WITH CHECK (
    can_write_report_types(auth.uid(), report_type_id)
);


