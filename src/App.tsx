import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { ThemeProvider } from './components/theme-provider.tsx';
import './index.css';

import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from 'sileo';
import { router } from './utils/routes';
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster
            options={{ fill: 'black', styles: { description: 'text-white' } }}
            position="top-center"
          />
          <RouterProvider router={router} context={{ queryClient }} />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
