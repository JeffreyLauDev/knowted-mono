"""
Knowted Report Tools

Tools for generating and managing reports.
"""

from typing import Optional, Dict, Any
from langchain_core.tools import tool
from ..core.api_tools import _make_api_request, get_context_from_config


@tool
async def generate_report(
    report_type: str,
    date_range: Optional[str] = None,
    team_id: Optional[str] = None,
    format: str = "json",
) -> str:
    """
    Generate reports for teams or organizations.
    
    The tool automatically uses your organization and user context for access control.
    
    Args:
        report_type: Type of report (e.g., "meetings", "team_performance", "analytics")
        date_range: Date range in ISO format (e.g., "2024-01-01,2024-12-31")
        team_id: Filter by team ID (optional)
        format: Output format ("json" or "text")
    
    Returns:
        Generated report as JSON or text
    """
    organization_id, user_id, internal_service_secret = get_context_from_config()
    if not organization_id or not user_id or not internal_service_secret:
        return "Error: organization_id, user_id, and internal_service_secret are required but not found in execution context"

    try:
        data: Dict[str, Any] = {
            "organization_id": organization_id,
            "report_type": report_type,
        }
        if date_range:
            data["date_range"] = date_range
        if team_id:
            data["team_id"] = team_id
        
        # Note: Reports generation endpoint doesn't exist in Swagger
        # Using report-types endpoint instead
        result = await _make_api_request(
            f"api/v1/report-types?organization_id={organization_id}",
            method="GET",
            organization_id=organization_id,
            user_id=user_id,
            internal_service_secret=internal_service_secret,
        )
        import json
        
        # Return available report types as the "generated report"
        response_text = f"Report generation not yet implemented. Available report types: {json.dumps(result, indent=2)}"
        
        if format == "text":
            return response_text
        
        return json.dumps({"message": "Report generation not yet implemented", "available_report_types": result}, indent=2)
    except Exception as e:
        return f"Error generating report: {str(e)}"


@tool
async def get_report_data(report_id: str) -> str:
    """
    Get data for a specific report.
    
    The tool automatically uses your organization and user context for access control.
    
    Args:
        report_id: The report ID
    
    Returns:
        Report data as JSON string
    """
    organization_id, user_id, internal_service_secret = get_context_from_config()
    if not organization_id or not user_id or not internal_service_secret:
        return "Error: organization_id, user_id, and internal_service_secret are required but not found in execution context"

    try:
        # Note: Reports endpoint doesn't exist, using report-types instead
        result = await _make_api_request(
            f"api/v1/report-types/{report_id}?organization_id={organization_id}",
            method="GET",
            organization_id=organization_id,
            user_id=user_id,
            internal_service_secret=internal_service_secret,
        )
        import json
        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error fetching report data: {str(e)}"


@tool
async def create_report_template(
    template_name: str,
    template_config: Dict[str, Any],
) -> str:
    """
    Create a custom report template.
    
    The tool automatically uses your organization and user context for access control.
    
    Args:
        template_name: Name of the template
        template_config: Template configuration as dictionary
    
    Returns:
        Created template data as JSON string
    """
    organization_id, user_id, internal_service_secret = get_context_from_config()
    if not organization_id or not user_id or not internal_service_secret:
        return "Error: organization_id, user_id, and internal_service_secret are required but not found in execution context"

    try:
        data = {
            "organization_id": organization_id,
            "name": template_name,
            "config": template_config,
        }
        # Note: Reports templates endpoint doesn't exist, using report-types instead
        result = await _make_api_request(
            "api/v1/report-types",
            method="POST",
            data=data,
            organization_id=organization_id,
            user_id=user_id,
            internal_service_secret=internal_service_secret,
        )
        import json
        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error creating report template: {str(e)}"


def _format_report_as_text(report_data: Dict[str, Any]) -> str:
    """Format report JSON as readable text."""
    lines = []
    lines.append(f"Report: {report_data.get('title', 'Untitled Report')}")
    lines.append("=" * 60)
    
    if "summary" in report_data:
        lines.append(f"\nSummary:\n{report_data['summary']}")
    
    if "metrics" in report_data:
        lines.append("\nMetrics:")
        for key, value in report_data["metrics"].items():
            lines.append(f"  - {key}: {value}")
    
    if "insights" in report_data:
        lines.append("\nInsights:")
        for insight in report_data["insights"]:
            lines.append(f"  - {insight}")
    
    return "\n".join(lines)

