import type { ChannelCardStatus } from '@/lib/gateway-channels';

export function toConnectionState(channel: ChannelCardStatus) {
  if (channel.connected) {
    return {
      label: 'Connected',
      variant: 'secondarySuccess' as const,
    };
  }

  if (channel.configured || channel.running) {
    return {
      label: 'Connecting',
      variant: 'secondaryWarning' as const,
    };
  }

  return {
    label: 'Not connected',
    variant: 'secondary' as const,
  };
}

export function normalizeWhatsAppStatusMessage(message: string | null): string | null {
  if (!message) {
    return null;
  }
  const lower = message.toLowerCase();
  if (lower.includes('status=515') || lower.includes('restart required')) {
    return 'WhatsApp is finalizing the link. This can take a few seconds.';
  }
  return message;
}

export function isTerminalWhatsAppWaitMessage(message: string | null): boolean {
  if (!message) {
    return false;
  }
  const lower = message.toLowerCase();
  return (
    lower.includes('login ended without a connection') ||
    lower.includes('login failed') ||
    lower.includes('qr expired')
  );
}

export function isWhatsAppQrTimeoutMessage(message: string | null): boolean {
  return Boolean(message?.toLowerCase().includes('timed out waiting for whatsapp qr'));
}
