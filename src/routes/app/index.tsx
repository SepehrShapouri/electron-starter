import { createFileRoute } from '@tanstack/react-router';
import AppHome from '@/pages/app-home';

export const Route = createFileRoute('/app/')({
  component: AppHome,
});
