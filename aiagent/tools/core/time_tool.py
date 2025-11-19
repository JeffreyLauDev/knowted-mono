"""
Time Tool - Get current date and time
"""

from datetime import datetime
from langchain_core.tools import tool

try:
    from zoneinfo import ZoneInfo
except ImportError:
    # Fallback for Python < 3.9
    from backports.zoneinfo import ZoneInfo


@tool
def get_current_time() -> str:
    """
    Get the current date and time in a human-readable format, defaulting to Australia timezone.
    
    Returns:
        Current date and time as a formatted string (e.g., "Monday, November 16, 2025 at 2:30 PM AEST")
    """
    # Get current time in Australia/Sydney timezone (handles AEST/AEDT automatically)
    australia_tz = ZoneInfo("Australia/Sydney")
    current_time = datetime.now(australia_tz)
    
    # Format in a human-readable way
    # Example: "Monday, November 16, 2025 at 2:30 PM AEST"
    day_name = current_time.strftime("%A")
    month_name = current_time.strftime("%B")
    day = str(current_time.day)  # Remove leading zero from day
    year = current_time.strftime("%Y")
    hour_12 = current_time.strftime("%I").lstrip("0") or "12"
    minute = current_time.strftime("%M")
    am_pm = current_time.strftime("%p")
    time_12h = f"{hour_12}:{minute} {am_pm}"
    timezone_abbr = current_time.strftime("%Z")
    
    formatted_time = f"{day_name}, {month_name} {day}, {year} at {time_12h} {timezone_abbr}"
    return formatted_time

