import { markdownToEmailHtml } from '../../../utils/markdown.utils';

export interface MeetingData {
  title: string;
  summary: string;
  duration_mins: number;
  meeting_date: Date;
  host_email: string;
  participants_email: string[];
  owner_email?: string; // Email of the meeting owner/creator
  video_url?: string;
  transcript_url?: string;
  chapters?: string;
  shareUrl?: string;
  meetingId: string; // Add meeting ID for proper dashboard links
}

export const EmailTemplates = {
  organizationInvitation: (
    firstName: string,
    organizationName: string,
    inviteId: string,
    teamName: string | undefined,
    frontendUrl: string,
  ) => {
    const acceptUrl = `${frontendUrl}/accept-invite/${inviteId}`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Join ${organizationName} on Knowted</title>
          <style>
              body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                  line-height: 1.6;
                  color: #1D503A;
                  margin: 0;
                  padding: 20px;
                  background-color: #FAF5EE;
              }
              .container {
                  max-width: 560px;
                  margin: 0 auto;
                  background-color: #ffffff;
                  border-radius: 12px;
                  box-shadow: 0 4px 20px rgba(29, 80, 58, 0.1);
                  overflow: hidden;
                  border: 1px solid rgba(29, 80, 58, 0.1);
              }
              .header {
                  background: linear-gradient(135deg, #1D503A 0%, #2A6B4F 100%);
                  padding: 40px 20px;
                  text-align: center;
                  color: white;
              }
              .header h1 {
                  margin: 0;
                  font-size: 28px;
                  font-weight: 600;
              }
              .logo {
                  width: 140px;
                  height: auto;
                  margin-bottom: 16px;
                  filter: brightness(0) invert(1);
              }
              .content {
                  padding: 40px 30px;
                  background-color: #ffffff;
              }
              .invitation-text {
                  font-size: 18px;
                  color: #1D503A;
                  margin-bottom: 24px;
                  line-height: 1.7;
              }
              .team-info {
                  background-color: #FAF5EE;
                  padding: 24px;
                  border-radius: 8px;
                  margin: 24px 0;
                  border-left: 4px solid #1D503A;
              }
              .team-info h3 {
                  margin: 0 0 16px 0;
                  color: #1D503A;
                  font-size: 18px;
                  font-weight: 600;
              }
              .team-name {
                  font-size: 20px;
                  font-weight: 600;
                  color: #1D503A;
                  margin-bottom: 8px;
              }
              .cta-section {
                  text-align: center;
                  margin: 40px 0;
              }
              .primary-button {
                  display: inline-block;
                  padding: 16px 32px;
                  background: linear-gradient(135deg, #1D503A 0%, #2A6B4F 100%);
                  color: white !important;
                  text-decoration: none;
                  border-radius: 8px;
                  font-weight: 600;
                  text-align: center;
                  transition: all 0.2s ease;
                  box-shadow: 0 4px 12px rgba(29, 80, 58, 0.2);
                  margin: 0 8px 16px 8px;
              }
              .primary-button:hover {
                  transform: translateY(-2px);
                  box-shadow: 0 6px 20px rgba(29, 80, 58, 0.3);
              }
              .secondary-button {
                  display: inline-block;
                  padding: 16px 32px;
                  background: white;
                  color: #1D503A !important;
                  text-decoration: none;
                  border: 2px solid #1D503A;
                  border-radius: 8px;
                  font-weight: 600;
                  text-align: center;
                  transition: all 0.2s ease;
                  margin: 0 8px 16px 8px;
              }
              .secondary-button:hover {
                  background: #1D503A;
                  color: white !important;
                  transform: translateY(-2px);
                  box-shadow: 0 4px 12px rgba(29, 80, 58, 0.2);
              }
              .footer {
                  padding: 24px;
                  text-align: center;
                  background-color: #FAF5EE;
                  border-top: 1px solid rgba(29, 80, 58, 0.1);
              }
              .footer p {
                  margin: 8px 0;
                  color: #6B7280;
                  font-size: 13px;
              }
              .divider {
                  height: 1px;
                  background-color: rgba(29, 80, 58, 0.1);
                  margin: 24px 0;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <img src="https://knowted.io/logos/knowted-yellow-horizontal.png" alt="Knowted" class="logo">
                  <h1>You're Invited!</h1>
              </div>
              <div class="content">
                  <p class="invitation-text">
                      You've been invited to join <strong>${organizationName}</strong> on Knowted! 
                      Knowted helps teams collaborate better with AI-powered meeting insights and seamless calendar integration.
                  </p>
                  
                  ${
                    teamName
                      ? `
                  <div class="team-info">
                      <h3>Team:</h3>
                      <p class="team-name">${teamName}</p>
                  </div>
                  `
                      : ""
                  }
                  
                  <div class="cta-section">
                      <a href="${acceptUrl}" class="primary-button">
                          Accept Invitation
                      </a>
                      <a href="${frontendUrl}/dashboard" class="secondary-button">
                          Learn More
                      </a>
                  </div>
                  
                  <div class="divider"></div>
                  
                  <p style="color: #6B7280; font-size: 14px; text-align: center;">
                      If you have any questions, please contact your team administrator.
                  </p>
              </div>
              <div class="footer">
                  <p>This is an automated message from Knowted, please do not reply to this email.</p>
                  <p>&copy; ${new Date().getFullYear()} Knowted. All rights reserved.</p>
              </div>
          </div>
      </body>
      </html>
    `;
  },

  testEmail: () => `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Test Email - Knowted</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                line-height: 1.6;
                color: #1D503A;
                margin: 0;
                padding: 20px;
                background-color: #FAF5EE;
            }
            .container {
                max-width: 560px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(29, 80, 58, 0.1);
                overflow: hidden;
                border: 1px solid rgba(29, 80, 58, 0.1);
            }
            .header {
                background: linear-gradient(135deg, #1D503A 0%, #2A6B4F 100%);
                padding: 40px 20px;
                text-align: center;
                color: white;
            }
            .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 600;
            }
            .logo {
                width: 140px;
                height: auto;
                margin-bottom: 16px;
                filter: brightness(0) invert(1);
            }
            .content {
                padding: 40px 30px;
                background-color: #ffffff;
                text-align: center;
            }
            .test-message {
                font-size: 18px;
                color: #1D503A;
                margin-bottom: 24px;
                line-height: 1.7;
            }
            .cta-section {
                text-align: center;
                margin: 40px 0;
            }
            .primary-button {
                display: inline-block;
                padding: 16px 32px;
                background: linear-gradient(135deg, #1D503A 0%, #2A6B4F 100%);
                color: white !important;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                text-align: center;
                transition: all 0.2s ease;
                box-shadow: 0 4px 12px rgba(29, 80, 58, 0.2);
                margin: 0 8px 16px 8px;
            }
            .primary-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(29, 80, 58, 0.3);
            }
            .footer {
                padding: 24px;
                text-align: center;
                background-color: #FAF5EE;
                border-top: 1px solid rgba(29, 80, 58, 0.1);
            }
            .footer p {
                margin: 8px 0;
                color: #6B7280;
                font-size: 13px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="https://knowted.io/logos/knowted-yellow-horizontal.png" alt="Knowted" class="logo">
                <h1>Test Email</h1>
            </div>
            <div class="content">
                <p class="test-message">
                    This is a test email from Knowted to verify that your email service is working correctly.
                </p>
                
                <div class="cta-section">
                    <a href="https://knowted.io" class="primary-button">
                        Visit Knowted
                    </a>
                </div>
            </div>
            <div class="footer">
                <p>This is a test email from Knowted, please do not reply to this email.</p>
                <p>&copy; ${new Date().getFullYear()} Knowted. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `,

  meetingAnalysis: (
    meetingData: MeetingData,
    organizationName: string,
    frontendUrl: string,
  ) => {
    // Format meeting date
    const meetingDate = new Date(meetingData.meeting_date).toLocaleDateString(
      "en-US",
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      },
    );

    // Format duration
    const duration =
      meetingData.duration_mins > 0
        ? `${Math.floor(meetingData.duration_mins)} min ${Math.round((meetingData.duration_mins % 1) * 60)} sec`
        : "Duration not available";

    // Create action button HTML - only show Watch Recording if share URL is available
    const meetingDashboardUrl = `${frontendUrl}/dashboard/meetings/${meetingData.meetingId}`;

    const actionButtonsHtml = meetingData.shareUrl
      ? `
      <div class="cta-section">
        <a href="${meetingData.shareUrl}" class="primary-button">
          Watch Meeting Recording
        </a>
        <a href="${meetingDashboardUrl}" class="secondary-button">
          View in Dashboard
        </a>
      </div>
    `
      : `
      <div class="cta-section">
        <a href="${meetingDashboardUrl}" class="primary-button">
          View in Dashboard
        </a>
      </div>
    `;

    return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Meeting Recording - ${meetingData.title}</title>
          <style>
              body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                  line-height: 1.6;
                  color: #1D503A;
                  margin: 0;
                  padding: 20px;
                  background-color: #FAF5EE;
              }
              .container {
                  max-width: 560px;
                  margin: 0 auto;
                  background-color: #ffffff;
                  border-radius: 12px;
                  box-shadow: 0 4px 20px rgba(29, 80, 58, 0.1);
                  overflow: hidden;
                  border: 1px solid rgba(29, 80, 58, 0.1);
              }
              .header {
                  background: linear-gradient(135deg, #1D503A 0%, #2A6B4F 100%);
                  padding: 40px 20px;
                  text-align: center;
                  color: white;
              }
              .header h1 {
                  margin: 0;
                  font-size: 28px;
                  font-weight: 600;
              }
              .logo {
                  width: 140px;
                  height: auto;
                  margin-bottom: 16px;
                  filter: brightness(0) invert(1);
              }
              .content {
                  padding: 40px 30px;
                  background-color: #ffffff;
              }
              .meeting-title {
                  font-size: 24px;
                  font-weight: 600;
                  color: #1D503A;
                  margin: 0 0 16px 0;
                  text-align: center;
              }
              .meeting-meta {
                  text-align: center;
                  color: #6B7280;
                  font-size: 16px;
                  margin-bottom: 32px;
                  padding-bottom: 24px;
                  border-bottom: 1px solid rgba(29, 80, 58, 0.1);
              }
              .summary-section {
                  margin: 32px 0;
              }
              .summary-section h3 {
                  color: #1D503A;
                  margin: 0 0 20px 0;
                  font-size: 20px;
                  font-weight: 600;
                  display: flex;
                  align-items: center;
              }
              .summary-section h3::before {
                  content: "📋";
                  margin-right: 12px;
                  font-size: 24px;
              }
              .summary-content {
                  background-color: #FAF5EE;
                  padding: 24px;
                  border-radius: 8px;
                  border-left: 4px solid #1D503A;
                  color: #374151;
                  line-height: 1.7;
                  font-size: 16px;
              }
              .meeting-details {
                  background-color: #F9FAFB;
                  padding: 20px;
                  border-radius: 8px;
                  margin: 24px 0;
                  border: 1px solid rgba(29, 80, 58, 0.1);
              }
              .meeting-details h4 {
                  margin: 0 0 16px 0;
                  color: #1D503A;
                  font-size: 18px;
                  font-weight: 600;
              }
              .detail-row {
                  display: flex;
                  justify-content: space-between;
                  margin: 12px 0;
                  padding: 8px 0;
                  border-bottom: 1px solid rgba(29, 80, 58, 0.1);
              }
              .detail-row:last-child {
                  border-bottom: none;
              }
              .detail-label {
                  font-weight: 600;
                  color: #6B7280;
              }
              .detail-value {
                  color: #1D503A;
                  font-weight: 500;
              }
              .cta-section {
                  text-align: center;
                  margin: 40px 0;
              }
              .primary-button {
                  display: inline-block;
                  padding: 16px 32px;
                  background: linear-gradient(135deg, #1D503A 0%, #2A6B4F 100%);
                  color: white !important;
                  text-decoration: none;
                  border-radius: 8px;
                  font-weight: 600;
                  text-align: center;
                  transition: all 0.2s ease;
                  box-shadow: 0 4px 12px rgba(29, 80, 58, 0.2);
                  margin: 0 8px 16px 8px;
              }
              .primary-button:hover {
                  transform: translateY(-2px);
                  box-shadow: 0 6px 20px rgba(29, 80, 58, 0.3);
              }
              .secondary-button {
                  display: inline-block;
                  padding: 16px 32px;
                  background: white;
                  color: #1D503A !important;
                  text-decoration: none;
                  border: 2px solid #1D503A;
                  border-radius: 8px;
                  font-weight: 600;
                  text-align: center;
                  transition: all 0.2s ease;
                  margin: 0 8px 16px 8px;
              }
              .secondary-button:hover {
                  background: #1D503A;
                  color: white !important;
                  transform: translateY(-2px);
                  box-shadow: 0 4px 12px rgba(29, 80, 58, 0.2);
              }
              .footer {
                  padding: 24px;
                  text-align: center;
                  background-color: #FAF5EE;
                  border-top: 1px solid rgba(29, 80, 58, 0.1);
              }
              .footer p {
                  margin: 8px 0;
                  color: #6B7280;
                  font-size: 13px;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <img src="https://knowted.io/logos/knowted-yellow-horizontal.png" alt="Knowted" class="logo">
                  <h1>Meeting Summary</h1>
              </div>
              <div class="content">
                  <h2 class="meeting-title">${meetingData.title}</h2>
                  <div class="meeting-meta">
                      ${meetingDate} • ${duration}
                  </div>
                  
                  <div class="summary-section">
                      <h3>Meeting Summary</h3>
                      <div class="summary-content">
                          ${markdownToEmailHtml(meetingData.summary)}
                      </div>
                  </div>
                  
                  <div class="meeting-details">
                      <h4>Meeting Information</h4>
                      <div class="detail-row">
                          <span class="detail-label">Organization:</span>
                          <span class="detail-value">${organizationName}</span>
                      </div>
                      <div class="detail-row">
                          <span class="detail-label">Participants:</span>
                          <span class="detail-value">${meetingData.participants_email.length} people</span>
                      </div>
                  </div>

                  ${actionButtonsHtml}
                  
                  <p style="color: #6B7280; font-size: 14px; text-align: center; margin-top: 32px;">
                      You can also access this meeting recording in your Knowted dashboard.
                  </p>
              </div>
              <div class="footer">
                  <p>This is an automated message from Knowted, please do not reply to this email.</p>
                  <p>&copy; ${new Date().getFullYear()} Knowted. All rights reserved.</p>
              </div>
          </div>
      </body>
      </html>
    `;
  },
};
