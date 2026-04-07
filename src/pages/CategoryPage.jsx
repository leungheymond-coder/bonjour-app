import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { categories, vocabulary } from '@/data/vocabulary'
import WordCard from '@/components/WordCard'

function CategoryGrid({ onSelect }) {
  return (
    <div className="p-4 flex flex-col gap-5">
      <div>
        <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-1">
          Vocabulaire
        </p>
        <h1 className="text-2xl font-bold text-foreground font-heading">
          Library
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {categories.map((cat, i) => {
          const count = vocabulary.filter((w) => w.category === cat.id).length
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat)}
              className="animate-fade-up card-frosted p-4 flex flex-col items-start gap-2 text-left hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200"
              style={{
                borderLeftWidth: 4,
                borderLeftColor: cat.color,
                animationDelay: `${i * 60}ms`,
              }}
            >
              <span className="text-3xl">{cat.emoji}</span>
              <div>
                <p className="font-semibold text-foreground text-sm leading-tight">
                  {cat.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {cat.labelChinese}
                </p>
              </div>
              <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {count} words
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function WordList({ category, onBack }) {
  const words = vocabulary.filter((w) => w.category === category.id)

  return (
    <div className="flex flex-col animate-fade-up">
      {/* Sticky glassmorphism header */}
      <div
        className="sticky top-0 z-10 bg-background/85 backdrop-blur-xl border-b border-border/50"
        style={{ borderLeftWidth: 3, borderLeftColor: category.color }}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={onBack}
            aria-label="Back to categories"
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-colors active:scale-90 shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xl">{category.emoji}</span>
          <div className="min-w-0">
            <p className="font-bold text-foreground leading-tight font-heading truncate">
              {category.label}
            </p>
            <p className="text-xs text-muted-foreground">{category.labelChinese}</p>
          </div>
          <span className="ml-auto shrink-0 text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
            {words.length}
          </span>
        </div>
      </div>

      {/* Word cards with stagger */}
      <div className="p-4 flex flex-col gap-3">
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
    </div>
  )
}

export default function CategoryPage() {
  const [selected, setSelected] = useState(null)
  if (selected) return <WordList category={selected} onBack={() => setSelected(null)} />
  return <CategoryGrid onSelect={setSelected} />
}
