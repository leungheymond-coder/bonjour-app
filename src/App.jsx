import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import BottomNav from '@/components/BottomNav'
import Categories from '@/pages/CategoryPage'
import Listen from '@/pages/ListenPage'
import Favourites from '@/pages/FavouritesPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-svh max-w-lg mx-auto bg-background">
        <main className="flex-1 pb-16">
          <Routes>
            <Route path="/" element={<Navigate to="/categories" replace />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/listen" element={<Listen />} />
            <Route path="/favourites" element={<Favourites />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}
