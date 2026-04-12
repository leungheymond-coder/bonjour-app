import { createBrowserRouter, RouterProvider, Outlet, Navigate } from 'react-router-dom'
import BottomNav from '@/components/BottomNav'
import LibraryPage from '@/pages/LibraryPage'
import ListenPage from '@/pages/ListenPage'
import CollectionsPage from '@/pages/CollectionsPage'
import PracticePage from '@/pages/PracticePage'

function Layout() {
  return (
    <div className="relative flex flex-col min-h-svh max-w-lg mx-auto bg-background overflow-hidden">
      <div className="blob-1" />
      <div className="blob-2" />
      <div className="blob-3" />
      <main className="relative z-10 flex-1 pb-16">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/',            element: <LibraryPage /> },
      { path: '/listen',      element: <ListenPage /> },
      { path: '/collections', element: <CollectionsPage /> },
      { path: '/practice',    element: <PracticePage /> },
      { path: '*',            element: <Navigate to="/" replace /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
