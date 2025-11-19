export class SecurityTemplates {
  static suspiciousActivity(incident: {
    type: string;
    details: string;
    time: string;
    ip?: string;
    userEmail?: string;
  }) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <div style="background-color: #dc3545; color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 24px;">🚨 Security Alert: Suspicious Activity</h2>
        </div>
        
        <p style="font-size: 16px; line-height: 1.5;">We detected unusual activity on your Knowted account:</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <ul style="margin: 0; padding-left: 20px;">
            <li style="margin-bottom: 8px;"><strong>Type:</strong> ${incident.type}</li>
            <li style="margin-bottom: 8px;"><strong>Time:</strong> ${incident.time}</li>
            <li style="margin-bottom: 8px;"><strong>Details:</strong> ${incident.details}</li>
            ${incident.ip ? `<li style="margin-bottom: 8px;"><strong>IP Address:</strong> ${incident.ip}</li>` : ""}
            ${incident.userEmail ? `<li style="margin-bottom: 8px;"><strong>User:</strong> ${incident.userEmail}</li>` : ""}
          </ul>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold; color: #856404;">⚠️ What to do:</p>
          <ul style="margin: 10px 0 0 20px; color: #856404;">
            <li>If this wasn't you, please change your password immediately</li>
            <li>If this was you, no action is needed</li>
            <li>Contact support if you have any concerns</li>
          </ul>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          This is an automated security alert from Knowted. If you have any questions, please contact our support team.
        </p>
      </div>
    `;
  }

  static systemIssue(incident: {
    issue: string;
    time: string;
    status: string;
    severity: "low" | "medium" | "high" | "critical";
  }) {
    const severityColors = {
      low: "#28a745",
      medium: "#ffc107",
      high: "#fd7e14",
      critical: "#dc3545",
    };

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <div style="background-color: ${severityColors[incident.severity]}; color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 24px;">⚠️ System Alert: Service Issue</h2>
        </div>
        
        <p style="font-size: 16px; line-height: 1.5;">We detected a system issue that may affect your Knowted experience:</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <ul style="margin: 0; padding-left: 20px;">
            <li style="margin-bottom: 8px;"><strong>Issue:</strong> ${incident.issue}</li>
            <li style="margin-bottom: 8px;"><strong>Time:</strong> ${incident.time}</li>
            <li style="margin-bottom: 8px;"><strong>Status:</strong> ${incident.status}</li>
            <li style="margin-bottom: 8px;"><strong>Severity:</strong> ${incident.severity.toUpperCase()}</li>
          </ul>
        </div>
        
        <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold; color: #0c5460;">ℹ️ What we're doing:</p>
          <ul style="margin: 10px 0 0 20px; color: #0c5460;">
            <li>Our team is investigating the issue</li>
            <li>We're working to resolve this quickly</li>
            <li>Updates will be sent as available</li>
          </ul>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          This is an automated system alert from Knowted. We apologize for any inconvenience.
        </p>
      </div>
    `;
  }
}
