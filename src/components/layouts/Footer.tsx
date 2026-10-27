import { Link } from 'react-router'

import { Container } from '@/components/shared/Container'
import { Logo } from '@/components/shared/Logo'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { market } from '@/config/market'
import { footerNav } from '@/config/navigation'
import { env } from '@/lib/env'

export function Footer() {
  return (
    <footer className="border-t bg-card/60">
      <Container className="grid grid-cols-2 gap-x-6 gap-y-8 py-10 md:grid-cols-[1.5fr_repeat(3,1fr)] md:gap-10 md:py-12">
        <div className="col-span-2 space-y-3 md:col-span-1">
          <Logo />
          <p className="max-w-xs text-sm text-pretty text-muted-foreground">
            Discover and book trusted beauty, grooming and wellness services near you in {market.city}.
          </p>
        </div>
        {footerNav.map((column) => (
          <nav key={column.heading} aria-label={column.heading}>
            <h2 className="mb-3 type-label text-foreground">{column.heading}</h2>
            <ul className="space-y-2">
              {column.links.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>
      <Container className="flex flex-col gap-3 border-t py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {env.appName} · {market.city}, {market.country}
        </p>
        <div className="flex items-center gap-3">
          <p>
            {env.useMocks
              ? 'Prototype: listings, accounts and bookings are mock data.'
              : 'Pilot server: listings and accounts are demo data.'}
          </p>
          {/* The header has its own toggle from `sm` up. */}
          <ThemeToggle className="sm:hidden" />
        </div>
      </Container>
    </footer>
  )
}
