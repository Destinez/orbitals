import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';

const App = lazy(() => import('./App'));

function Root() {
  return (
    <Suspense fallback={null}>
      <App />
    </Suspense>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
