"""
Calculator Tool - Basic math operations
"""

from langchain_core.tools import tool
import re


@tool
def calculator(expression: str) -> str:
    """
    Evaluate a mathematical expression.
    
    Args:
        expression: Mathematical expression to evaluate (e.g., "2 + 2", "10 * 5", "100 / 4")
    
    Returns:
        Result of the calculation
    """
    try:
        # Sanitize: only allow numbers, operators, parentheses, and spaces
        # Remove any characters that aren't safe for eval
        sanitized = re.sub(r'[^0-9+\-*/().\s]', '', expression)
        
        # Use a restricted namespace for eval
        allowed_names = {
            "__builtins__": {},
            "abs": abs,
            "round": round,
            "min": min,
            "max": max,
            "sum": sum,
        }
        
        result = eval(sanitized, allowed_names, {})
        return str(result)
    except Exception as e:
        return f"Error calculating: {str(e)}"





