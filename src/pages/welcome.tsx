import Clawpilot from '@/components/icons/Clawpilot.svg';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useNavigate } from '@tanstack/react-router';
function Welcome() {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const tween = gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }
    );

    return () => {
      tween.kill();
    };
  }, []);

  return (
    <div className="flex flex-col w-full items-start gap-4" ref={containerRef}>
      <Clawpilot className="size-14 text-muted-foreground" />
      <div className="flex flex-col gap-2">
        <p className="text-3xl font-medium">Welcome to Clawpilot</p>
        <p className="text-base text-muted-foreground">
          OpenClaw for the masses
        </p>
      </div>
      <Separator />
      <div className="flex flex-col gap-2 w-full">
        <Button
          onClick={() => navigate({ to: '/auth/signup' })}
          size="lg"
          className="w-full"
        >
          I'm new here
        </Button>
        <Button
          size="lg"
          className="w-full"
          variant="secondary"
          onClick={() => navigate({ to: '/auth/login' })}
        >
          I already have an account
        </Button>
      </div>
    </div>
  );
}

export default Welcome;
