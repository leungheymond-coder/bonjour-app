import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import BottomNav from '@/components/BottomNav'
import LibraryPage from '@/pages/LibraryPage'
import ListenPage from '@/pages/ListenPage'
import CollectionsPage from '@/pages/CollectionsPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="relative flex flex-col min-h-svh max-w-lg mx-auto bg-background overflow-hidden">
        <div className="blob-1" />
        <div className="blob-2" />
        <div className="blob-3" />
        <main className="relative z-10 flex-1 pb-16">
          <Routes>
            <Route path="/"            element={<LibraryPage />} />
            <Route path="/listen"      element={<ListenPage />} />
            <Route path="/collections" element={<CollectionsPage />} />
            <Route path="*"            element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}
