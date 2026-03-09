import { useEffect, useRef } from 'react';
import { sileo } from 'sileo';

import { useGatewayConnection } from '@/lib/gateway/store';

export function useGatewayLifecycleToasts() {
  const connection = useGatewayConnection();
  const expectingRecoveryRef = useRef(false);
  const restartToastShownRef = useRef(false);
  const previousStatusRef = useRef(connection.status);

  useEffect(() => {
    if (connection.restartExpected && !restartToastShownRef.current) {
      expectingRecoveryRef.current = true;
      restartToastShownRef.current = true;
      sileo.info({
        title: 'Lobster is restarting',
        description: 'Applying your changes. Back in a few seconds.',
      });
    }

    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = connection.status;

    if (
      expectingRecoveryRef.current &&
      previousStatus !== 'ready' &&
      connection.status === 'ready'
    ) {
      sileo.success({
        title: 'Lobster is back',
        description: 'All set and ready to go.',
      });
      expectingRecoveryRef.current = false;
      restartToastShownRef.current = false;
    }
  }, [connection.restartExpected, connection.status]);
}
