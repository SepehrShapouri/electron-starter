import IconGmail from '@/components/icons/IconGmail.svg';
import IconGoogleCalendar from '@/components/icons/IconGoogleCalendar.svg';
import IconSlack from '@/components/icons/IconSlack.svg';
import type { ComponentType } from 'react';

export type IntegrationStatus =
  | 'loading'
  | 'connected'
  | 'not_connected'
  | 'coming_soon';

export type StaticIntegration = {
  id: string;
  toolkit: string;
  toolkitAliases?: string[];
  name: string;
  description: string;
  longDescription: string;
  features: string[];
  docsUrl?: string;
  bgColor: string;
};

export type Integration = StaticIntegration & {
  status: IntegrationStatus;
};

export const INTEGRATION_ICONS: Record<
  string,
  ComponentType<React.SVGProps<SVGSVGElement>>
> = {
  gmail: IconGmail,
  slack: IconSlack,
  'google-calendar': IconGoogleCalendar,
};

export const STATUS_CONFIG: Record<
  Exclude<IntegrationStatus, 'loading'>,
  { label: string; variant: 'secondarySuccess' | 'secondary' | 'outline' }
> = {
  connected: { label: 'Connected', variant: 'secondarySuccess' },
  not_connected: { label: 'Not connected', variant: 'secondary' },
  coming_soon: { label: 'Coming soon', variant: 'outline' },
};

export const STATIC_INTEGRATIONS: StaticIntegration[] = [
  {
    id: 'gmail',
    toolkit: 'gmail',
    name: 'Gmail',
    description: 'Read, compose, and manage email from your Gmail account.',
    longDescription:
      'Connect Gmail to let your AI assistant read, search, draft, and send emails on your behalf. Manage labels, search threads, and stay on top of your inbox without leaving the app.',
    features: [
      'Read and search emails',
      'Draft and send messages',
      'Manage labels and folders',
      'Access attachments',
    ],
    docsUrl: 'https://developers.google.com/gmail/api',
    bgColor: 'bg-muted',
  },
  {
    id: 'slack',
    toolkit: 'slack',
    name: 'Slack',
    description: 'Send messages and interact with your Slack workspace.',
    longDescription:
      'Connect Slack to let your AI assistant post messages, search conversations, and interact with your team workspace. Perfect for automating status updates and staying in the loop.',
    features: [
      'Post messages to channels',
      'Search conversation history',
      'Read direct messages',
      'Manage reactions and threads',
    ],
    docsUrl: 'https://api.slack.com',
    bgColor: 'bg-muted',
  },
  {
    id: 'google-calendar',
    toolkit: 'googlecalendar',
    toolkitAliases: ['google_calendar', 'google calendar'],
    name: 'Google Calendar',
    description: 'Sync calendars, events, and scheduling workflows.',
    longDescription:
      'Connect Google Calendar to let your assistant create, update, and organize events. Keep meetings in sync, find schedule gaps, and coordinate plans without switching tabs.',
    features: [
      'Create and update events',
      'Read upcoming schedule',
      'Find available time slots',
      'Manage attendees and reminders',
    ],
    docsUrl: 'https://developers.google.com/calendar/api',
    bgColor: 'bg-muted',
  },
];
