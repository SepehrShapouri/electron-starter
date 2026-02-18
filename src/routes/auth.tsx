import AuthLayout from '@/components/auth/auth-layout';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/auth')({
  component: AuthLayout,
});
