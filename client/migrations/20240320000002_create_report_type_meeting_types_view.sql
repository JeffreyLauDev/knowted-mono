-- Create a view that shows detailed relationship between report types and meeting types
CREATE OR REPLACE VIEW public.report_type_meeting_types_view AS
SELECT 
    rt.id AS report_type_id,
    rt.report_title,
    rt.report_prompt,
    rt.report_schedule,
    rt.organization_id,
    rt.user_id,
    rt.active AS report_type_active,
    rt.created_at AS report_type_created_at,
    rt.updated_at AS report_type_updated_at,
    
    -- Meeting Type details
    mt.id AS meeting_type_id,
    mt.meeting_type,
    mt.description_llm AS meeting_type_description,
    mt.analysis_metadata_structure,
    mt.created_at AS meeting_type_created_at,
    
    -- Report Type Meeting Type relationship
    rtmt.created_at AS relationship_created_at,
    
    -- Usage statistics for this specific report type + meeting type combination
    COUNT(DISTINCT r.id) AS total_reports_generated,
    MAX(r.report_date) AS latest_report_date,
    
    -- JSON array of all reports for this combination
    json_agg(
        DISTINCT jsonb_build_object(
            'report_id', r.id,
            'report_title', r.report_title,
            'report_status', r.report_status,
            'report_date', r.report_date,
            'created_at', r.created_at
        )
    ) FILTER (WHERE r.id IS NOT NULL) AS reports
FROM 
    public.report_types rt
    INNER JOIN public.report_type_meeting_types rtmt ON rt.id = rtmt.report_type_id
    INNER JOIN public.meeting_types mt ON rtmt.meeting_type_id = mt.id
    LEFT JOIN public.reports r ON rt.id = r.report_type_id AND mt.id = r.meeting_type_id
WHERE 
    rt.active = true
GROUP BY 
    rt.id,
    rt.report_title,
    rt.report_prompt,
    rt.report_schedule,
    rt.organization_id,
    rt.user_id,
    rt.active,
    rt.created_at,
    rt.updated_at,
    mt.id,
    mt.meeting_type,
    mt.description_llm,
    mt.analysis_metadata_structure,
    mt.created_at,
    rtmt.created_at;

-- Add comment to the view
COMMENT ON VIEW public.report_type_meeting_types_view IS 'Shows detailed relationship between report types and meeting types, including usage statistics and report history';

-- Create indexes on commonly queried columns
CREATE INDEX IF NOT EXISTS idx_report_type_meeting_types_view_user_id ON public.report_type_meeting_types_view (user_id);
CREATE INDEX IF NOT EXISTS idx_report_type_meeting_types_view_organization_id ON public.report_type_meeting_types_view (organization_id);
CREATE INDEX IF NOT EXISTS idx_report_type_meeting_types_view_report_type_id ON public.report_type_meeting_types_view (report_type_id);
CREATE INDEX IF NOT EXISTS idx_report_type_meeting_types_view_meeting_type_id ON public.report_type_meeting_types_view (meeting_type_id); 