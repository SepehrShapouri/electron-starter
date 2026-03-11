import { Outlet } from '@tanstack/react-router';
import { BackgroundGradientAnimation } from '../ui/background-gradient-animation';

export default function AuthLayout() {
  return (
    <BackgroundGradientAnimation
      gradientBackgroundStart="rgb(45, 74, 112)"
      gradientBackgroundEnd="rgb(28, 53, 89)"
      firstColor="18, 117, 255"
      secondColor="213, 33, 255"
      thirdColor="145, 230, 255"
      fourthColor="255, 255, 216"
      fifthColor="255, 105, 105"
      pointerColor="140, 100, 255"
      size="100%"
      blendingValue="hard-light"
    >
      <div className="absolute z-50 inset-0 flex items-center justify-center mx-auto p-20">
        <div className="max-w-238 w-full h-full flex items-center justify-center">
          <Outlet />
        </div>
      </div>
    </BackgroundGradientAnimation>
  );
}
