import { createFileRoute } from '@tanstack/react-router';
import Integrations from '@/pages/integrations';

export const Route = createFileRoute('/app/integrations')({
  component: Integrations,
});
