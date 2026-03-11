import { authApi } from '@/lib/auth-api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

export default function useSignout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { mutateAsync: signout, isPending: isSigningout } = useMutation({
    mutationFn: authApi.signOut,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['session'] });
      navigate({ to: '/auth/welcome' });
    },
  });
  return { signout, isSigningout };
}
