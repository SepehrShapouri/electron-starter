import { createFileRoute } from '@tanstack/react-router';
import Skills from '@/pages/skills';

export const Route = createFileRoute('/app/skills')({
  component: Skills,
});
