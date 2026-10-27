import { BadgeCheckIcon } from 'lucide-react'
import { Link } from 'react-router'

import { shopHref } from '@/features/shops/links'
import type { ShopSummary } from '@/types/business'

/**
 * The shop name in a card or list row, linked to the shop. Its pseudo-element stretches over the
 * card (the card needs `relative`). The verified tick stays on the same line as the last word, and
 * the link's accessible name is just the shop name.
 */
export function ShopNameLink({ shop }: { shop: Pick<ShopSummary, 'name' | 'slug' | 'verified'> }) {
  const lastSpace = shop.name.lastIndexOf(' ')
  const head = shop.name.slice(0, lastSpace + 1)
  const lastWord = shop.name.slice(lastSpace + 1)

  return (
    <>
      <Link
        to={shopHref(shop.slug)}
        className="outline-none group-hover:underline group-hover:underline-offset-4 after:absolute after:inset-0 after:content-['']"
      >
        {head}
        <span className="whitespace-nowrap">
          {lastWord}
          {shop.verified ? (
            <BadgeCheckIcon aria-hidden="true" className="ml-1 inline size-4 align-[-0.15em] text-primary" />
          ) : null}
        </span>
      </Link>
      {shop.verified ? <span className="sr-only"> Verified business</span> : null}
    </>
  )
}
