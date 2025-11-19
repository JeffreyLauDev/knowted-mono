-- Create a view that shows report types available to users
CREATE OR REPLACE VIEW public.user_report_types_view AS
SELECT 
    rt.id AS report_type_id,
    rt.report_title,
    rt.report_prompt,
    rt.report_schedule,
    rt.organization_id,
    rt.user_id,
    rt.active,
    rt.created_at AS report_type_created_at,
    rt.updated_at AS report_type_updated_at,
    
    -- Meeting Types associated with this report type
    array_agg(DISTINCT mt.meeting_type) AS available_meeting_types,
    array_agg(DISTINCT mt.id) AS meeting_type_ids,
    
    -- Count of reports generated for this report type
    COUNT(DISTINCT r.id) AS total_reports_generated,
    
    -- Latest report date for this report type
    MAX(r.report_date) AS latest_report_date
FROM 
    public.report_types rt
    LEFT JOIN public.report_type_meeting_types rtmt ON rt.id = rtmt.report_type_id
    LEFT JOIN public.meeting_types mt ON rtmt.meeting_type_id = mt.id
    LEFT JOIN public.reports r ON rt.id = r.report_type_id
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
    rt.updated_at;

-- Add comment to the view
COMMENT ON VIEW public.user_report_types_view IS 'Shows report types available to users with their associated meeting types and usage statistics';

-- Create indexes on commonly queried columns
CREATE INDEX IF NOT EXISTS idx_user_report_types_view_user_id ON public.user_report_types_view (user_id);
CREATE INDEX IF NOT EXISTS idx_user_report_types_view_organization_id ON public.user_report_types_view (organization_id);
CREATE INDEX IF NOT EXISTS idx_user_report_types_view_active ON public.user_report_types_view (active); 