import { createFileRoute } from '@tanstack/react-router';
import ChannelsPage from '@/pages/channels';

export const Route = createFileRoute('/app/channels')({
  component: ChannelsPage,
});
