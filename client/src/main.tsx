import { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import App from './App';
import { LoadBar } from '@/shared/components/load-bar/LoadBar';

const root = document.getElementById('root');
if (!root) throw new Error('not found root');

const LazyHomePage = lazy(() => import('@/pages/HomePage/HomePage'));
const LazyStartPage = lazy(() => import('@/pages/StartPage/StartPage'));
const LazyRoom = lazy(() => import('@/pages/Room/Room'));
const LazyConnectRoom = lazy(() => import('@/pages/ConnectRoom/ConnectRoom'));

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "/",
        element: <Suspense fallback={<LoadBar />}><LazyHomePage /></Suspense>
      },
      {
        path: "/create-room/",
        element: <Suspense fallback={<LoadBar />}><LazyStartPage /></Suspense>
      },
      {
        path: "/connect-room/",
        element: <Suspense fallback={<LoadBar />}><LazyConnectRoom /></Suspense>
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