import { router } from '@/utils/routes';
import '@fontsource-variable/inter';
import { RouterProvider } from '@tanstack/react-router';
import './index.css';

function App() {
  return <RouterProvider router={router} />;
}

export default App;
