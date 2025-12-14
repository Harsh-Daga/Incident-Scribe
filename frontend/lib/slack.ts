import { Incident } from '@/types/incident';

interface SlackMessage {
  channel?: string;
  text: string;
  blocks?: any[];
  attachments?: any[];
}

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

/**
 * Send a notification to Slack
 */
export async function sendSlackNotification(message: SlackMessage): Promise<boolean> {
  if (!SLACK_WEBHOOK_URL) {
    console.warn('SLACK_WEBHOOK_URL not configured');
    return false;
  }

  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Failed to send Slack notification:', error);
    return false;
  }
}

/**
 * Format an incident as a Slack message with rich blocks
 */
export function formatIncidentMessage(incident: Incident, type: 'created' | 'resolved' | 'escalated'): SlackMessage {
  const severityEmoji = {
    HIGH: ':red_circle:',
    MEDIUM: ':orange_circle:',
    LOW: ':yellow_circle:'
  };

  const typeEmoji = {
    created: ':rotating_light:',
    resolved: ':white_check_mark:',
    escalated: ':warning:'
  };

  const typeText = {
    created: 'New Incident Detected',
    resolved: 'Incident Resolved',
    escalated: 'Incident Escalated'
  };

  const severityColor = {
    HIGH: '#dc2626',
    MEDIUM: '#f59e0b',
    LOW: '#10b981'
  };

  const incidentUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/incident/${incident.id}`;

  return {
    text: `${typeEmoji[type]} ${typeText[type]}: ${incident.title}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${typeEmoji[type]} ${typeText[type]}`,
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Incident ID:*\n<${incidentUrl}|${incident.id}>`
          },
          {
            type: 'mrkdwn',
            text: `*Service:*\n${incident.service}`
          },
          {
            type: 'mrkdwn',
            text: `*Severity:*\n${severityEmoji[incident.severity]} ${incident.severity}`
          },
          {
            type: 'mrkdwn',
            text: `*Status:*\n${incident.status.toUpperCase()}`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Title:*\n${incident.title}`
        }
      },
      {
        type: 'divider'
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Context:*\n• Host: \`${incident.context.host}\`\n• Region: \`${incident.context.region}\`\n• Deployment: \`${incident.context.deployment}\``
        }
      }
    ],
    attachments: [
      {
        color: severityColor[incident.severity],
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Recent Logs:*\n\`\`\`${incident.logs.slice(0, 3).join('\n')}\`\`\``
            }
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'View Details',
                  emoji: true
                },
                url: incidentUrl,
                style: 'primary'
              },
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'Trigger AI Analysis',
                  emoji: true
                },
                url: `${incidentUrl}?action=analyze`,
                style: 'danger'
              }
            ]
          }
        ]
      }
    ]
  };
}

/**
 * Send incident created notification
 */
export async function notifyIncidentCreated(incident: Incident): Promise<boolean> {
  const message = formatIncidentMessage(incident, 'created');
  return sendSlackNotification(message);
}

/**
 * Send incident resolved notification
 */
export async function notifyIncidentResolved(incident: Incident): Promise<boolean> {
  const message = formatIncidentMessage(incident, 'resolved');
  return sendSlackNotification(message);
}

/**
 * Send incident escalated notification
 */
export async function notifyIncidentEscalated(incident: Incident): Promise<boolean> {
  const message = formatIncidentMessage(incident, 'escalated');
  return sendSlackNotification(message);
}

/**
 * Send AI analysis completion notification
 */
export async function notifyAIAnalysisComplete(incident: Incident, analysisUrl: string): Promise<boolean> {
  const message: SlackMessage = {
    text: `AI Analysis Complete for ${incident.id}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: ':brain: AI Analysis Complete',
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `The AI analysis for incident *${incident.id}* (${incident.title}) has completed successfully.`
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Analysis Results',
              emoji: true
            },
            url: analysisUrl,
            style: 'primary'
          }
        ]
      }
    ]
  };

  return sendSlackNotification(message);
}

/**
 * Send remediation action notification
 */
export async function notifyRemediationAction(
  incident: Incident,
  action: string,
  success: boolean,
  details: string
): Promise<boolean> {
  const emoji = success ? ':white_check_mark:' : ':x:';
  const status = success ? 'Succeeded' : 'Failed';

  const message: SlackMessage = {
    text: `Remediation ${status} for ${incident.id}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} Remediation ${status}`,
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Incident:*\n${incident.id}`
          },
          {
            type: 'mrkdwn',
            text: `*Action:*\n\`${action}\``
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Details:*\n${details}`
        }
      }
    ]
  };

  return sendSlackNotification(message);
}
