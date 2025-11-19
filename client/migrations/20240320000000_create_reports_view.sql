-- Create a view that combines reports with their related information
CREATE OR REPLACE VIEW public.reports_view AS
SELECT 
    r.id AS report_id,
    r.report_type_id,
    r.meeting_type_id,
    r.report_title,
    r.report_prompt,
    r.report_detail,
    r.report_status,
    r.report_date,
    r.organization_id,
    r.user_id,
    r.created_at AS report_created_at,
    r.updated_at AS report_updated_at,
    
    -- Report Type information
    rt.report_title AS report_type_title,
    rt.report_prompt AS report_type_prompt,
    rt.report_schedule,
    rt.active AS report_type_active,
    rt.created_at AS report_type_created_at,
    rt.updated_at AS report_type_updated_at,
    
    -- Meeting Type information
    mt.meeting_type,
    mt.description_llm AS meeting_type_description,
    mt.analysis_metadata_structure,
    mt.created_at AS meeting_type_created_at,
    
    -- Report Type Meeting Type relationship
    rtmt.created_at AS report_type_meeting_type_created_at
FROM 
    public.reports r
    LEFT JOIN public.report_types rt ON r.report_type_id = rt.id
    LEFT JOIN public.meeting_types mt ON r.meeting_type_id = mt.id
    LEFT JOIN public.report_type_meeting_types rtmt 
        ON r.report_type_id = rtmt.report_type_id 
        AND r.meeting_type_id = rtmt.meeting_type_id;

-- Add comment to the view
COMMENT ON VIEW public.reports_view IS 'A comprehensive view of reports with their related report types and meeting types information';

-- Create indexes on commonly queried columns
CREATE INDEX IF NOT EXISTS idx_reports_view_organization_id ON public.reports_view (organization_id);
CREATE INDEX IF NOT EXISTS idx_reports_view_user_id ON public.reports_view (user_id);
CREATE INDEX IF NOT EXISTS idx_reports_view_report_type_id ON public.reports_view (report_type_id);
CREATE INDEX IF NOT EXISTS idx_reports_view_meeting_type_id ON public.reports_view (meeting_type_id);
CREATE INDEX IF NOT EXISTS idx_reports_view_report_status ON public.reports_view (report_status);
CREATE INDEX IF NOT EXISTS idx_reports_view_report_date ON public.reports_view (report_date); 