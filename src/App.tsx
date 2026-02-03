import { RouterProvider } from '@tanstack/react-router';
import './index.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './components/ThemeProvider';

import { TooltipProvider } from '@/components/ui/tooltip';
import { router } from './utils/routes';
import { Toaster } from '@/components/ui/sonner';

const queryClient = new QueryClient();


function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <RouterProvider router={router} context={{ queryClient }} />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
