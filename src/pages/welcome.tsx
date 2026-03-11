import ClawpilotAvatar from '@/components/icons/ClawpilotAvatar.svg';
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
    <div
      className="flex w-full h-full max-h-[568px] p-8 rounded-3xl bg-floated-blur backdrop-blur-[100px] items-center justify-center"
      ref={containerRef}
    >
      <div className="flex max-w-[380px] w-full gap-16 flex-col items-center shrink-0">
        <div className="flex items-center flex-col gap-6">
          <ClawpilotAvatar className="size-14 text-muted-foreground shadow-[0_0_80px_20px_rgba(248,29,25,0.20)] rounded-lg" />
          <div className="flex flex-col gap-2 text-center">
            <p className="text-lg font-medium text-muted-foreground">
              OpenClaw for the masses
            </p>
            <p className="text-3xl font-medium text-foreground">
              Welcome to Clawpilot
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3 w-full">
          <Button size="xl" onClick={() => navigate({ to: '/auth/signup' })}>
            I'm new here
          </Button>
          <Button
            size="xl"
            variant="secondary"
            onClick={() => navigate({ to: '/auth/login' })}
          >
            I already have an account
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Welcome;
