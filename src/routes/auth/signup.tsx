import Signup from '@/pages/Signup';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/auth/signup')({
  component: Signup,
});
