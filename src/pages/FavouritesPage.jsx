import { useFavourites } from '@/hooks/useFavourites'
import { getById } from '@/data/vocabulary'
import WordCard from '@/components/WordCard'

export default function FavouritesPage() {
  const { favourites } = useFavourites()
  const words = favourites.map(getById).filter(Boolean)

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-1">
            Mes mots
          </p>
          <h1 className="text-2xl font-bold text-foreground font-heading">Favourites</h1>
        </div>
        {words.length > 0 && (
          <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full mb-0.5">
            {words.length} {words.length === 1 ? 'word' : 'words'}
          </span>
        )}
      </div>

      {words.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 pt-20 text-center">
          <span className="text-5xl animate-float inline-block">⭐</span>
          <p className="font-bold text-foreground text-xl font-heading mt-2">
            Rien pour l'instant
          </p>
          <p className="text-sm text-muted-foreground max-w-[220px] leading-relaxed">
            Star a word in Categories to save it here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {words.map((word, i) => (
            <div
              key={word.id}
              className="animate-fade-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <WordCard word={word} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
