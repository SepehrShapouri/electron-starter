import '@fontsource-variable/inter';
import { RouterProvider } from '@tanstack/react-router';
import { ThemeProvider } from '@/components/theme-provider';
import { router } from '@/utils/routes';
import './index.css';

function App() {
  return (
    <ThemeProvider
      defaultTheme="system"
      storageKey="electron-boilerplate-theme"
    >
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}

export default App;
