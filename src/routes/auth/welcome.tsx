import Welcome from '@/pages/welcome'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/welcome')({
  component: Welcome,
})
