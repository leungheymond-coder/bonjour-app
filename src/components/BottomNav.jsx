import { NavLink } from 'react-router-dom'
import { BookOpen, Headphones, Folders } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/',            label: 'Library',     icon: BookOpen   },
  { to: '/listen',      label: 'Practice',    icon: Headphones },
  { to: '/collections', label: 'Collections', icon: Folders    },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-6">
        {navItems.map(({ to, label, icon: Icon }) => ( // eslint-disable-line no-unused-vars -- Icon is used inside render prop
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'relative flex flex-col items-center gap-1 pt-1 text-[11px] font-medium transition-colors duration-200',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute -top-px left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-primary" />
                )}
                <Icon
                  className="h-5 w-5 transition-all duration-200"
                  strokeWidth={isActive ? 2.2 : 1.5}
                />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
