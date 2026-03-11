import React from 'react';
import { BackgroundGradientAnimation } from '@/components/ui/background-gradient-animation';

export default function BackgroundGradientAnimationDemo() {
  return (
    <BackgroundGradientAnimation
      gradientBackgroundStart="rgb(45, 74, 112)"
      gradientBackgroundEnd="rgb(28, 53, 89)"
      firstColor="255, 255, 255"
      secondColor="240, 249, 255"
      thirdColor="224, 242, 254"
      fourthColor="186, 230, 253"
      fifthColor="255, 255, 255"
      pointerColor="255, 255, 255"
      size="100%"
      blendingValue="soft-light"
    >
      <div className="absolute z-50 inset-0 flex items-center justify-center text-white font-bold px-4 pointer-events-none text-3xl text-center md:text-4xl lg:text-7xl">
        <p className="bg-clip-text text-transparent drop-shadow-2xl bg-gradient-to-b from-white/80 to-white/20">
          Gradients X Animations
        </p>
      </div>
    </BackgroundGradientAnimation>
  );
}
