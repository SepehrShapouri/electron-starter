import { MessageCircle, Send, Speech } from 'lucide-react';
import type { ComponentType } from 'react';

export type StaticChannel = {
  id: string;
  label: string;
  description: string;
};

export const TELEGRAM_STEPS = [
  'Open Telegram and go to @BotFather.',
  'Start a chat and run /newbot.',
  'Follow prompts to set bot name and username.',
  'Copy the bot token BotFather sends you.',
  'Paste it below and click Connect.',
];

export const WHATSAPP_STEPS = [
  'Open WhatsApp on your phone.',
  'Go to Settings -> Linked Devices.',
  'Tap Link a Device.',
  'Scan the QR code shown below.',
  'Wait for the connected status to appear.',
];

export const STATIC_CHANNELS: StaticChannel[] = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    description: 'Link WhatsApp Web and chat through your agent.',
  },
  {
    id: 'telegram',
    label: 'Telegram',
    description: 'Connect your Telegram bot and start receiving DMs.',
  },
];

export const CHANNEL_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  telegram: Send,
  whatsapp: MessageCircle,
  discord: Speech,
};
