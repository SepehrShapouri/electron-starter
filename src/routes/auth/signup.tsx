import { createFileRoute } from '@tanstack/react-router';
import Signup from '@/pages/signup';

export const Route = createFileRoute('/auth/signup')({
  component: Signup,
});
