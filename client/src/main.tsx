import { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import App from './App';
import ConnectRoom from './pages/ConnectRoom/ConnectRoom';
import { LoadBar } from './components/LoadBar/LoadBar';

const root = document.getElementById('root');
if (!root) throw new Error('not found root');

const LazyStartPage = lazy(() => import('@/pages/StartPage/StartPage'));
const LazyRoom = lazy(() => import('@/pages/Room/Room'));

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "/",
        element: <Suspense fallback={<LoadBar />}><LazyStartPage /></Suspense>
      },
      {
        path: "/connect-room/",
        element: <ConnectRoom />
      },
      {
        path: "/room/:roomID/",
        element: <Suspense fallback={<LoadBar />}><LazyRoom /></Suspense>
      }
    ]
  },
]);

const container = createRoot(root);
container.render(<RouterProvider router={router} />)