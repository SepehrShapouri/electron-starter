import SettingsPage from '@/pages/settings';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/settings')({
  component: SettingsPage,
});
