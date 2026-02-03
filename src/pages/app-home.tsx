import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { authApi } from '../lib/auth-api';
import { loadGatewayProfile, saveGatewayProfile } from '../lib/gateway-storage';

export default function AppHome() {
  const sessionQuery = useQuery({
    queryKey: ['session'],
    queryFn: authApi.getSession,
  });

  const gatewayProfile = loadGatewayProfile();

  const provisionQuery = useQuery({
    queryKey: ['gateway-provision'],
    queryFn: authApi.provisionGateway,
    enabled: !gatewayProfile,
  });

  useEffect(() => {
    if (provisionQuery.data && !gatewayProfile) {
      saveGatewayProfile(provisionQuery.data);
    }
  }, [provisionQuery.data, gatewayProfile]);

  if (sessionQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <div className="h-full">
    <div className='max-w-2xl mx-auto w-full h-full'>
      
    </div>
  </div>;
}
