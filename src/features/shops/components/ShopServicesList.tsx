import { categoryIconFor } from '@/config/category-icons'
import { ServiceRow } from '@/features/shops/components/ServiceRow'
import type { Service } from '@/types/business'
import type { ServiceCategory } from '@/types/catalog'

interface ShopServicesListProps {
  services: Service[]
  shopSlug: string
  categories: ServiceCategory[]
  /** Group under sub-category headings (the full menu); otherwise a flat list. */
  grouped?: boolean
}

/** The service menu, in the merchant's order (MER-02, CUS-05). */
export function ShopServicesList({ services, shopSlug, categories, grouped }: ShopServicesListProps) {
  const categoryOf = (service: Service) => categories.find((category) => category.id === service.categoryId)

  if (!grouped) {
    return (
      <ul className="divide-y divide-border/70">
        {services.map((service) => (
          <li key={service.id}>
            <ServiceRow service={service} shopSlug={shopSlug} icon={categoryIconFor(categoryOf(service))} />
          </li>
        ))}
      </ul>
    )
  }

  const groups = new Map<string, Service[]>()
  for (const service of services) {
    const name = categoryOf(service)?.name ?? 'Other services'
    groups.set(name, [...(groups.get(name) ?? []), service])
  }

  return (
    <div className="space-y-6">
      {[...groups].map(([name, items]) => (
        <section key={name} aria-label={name}>
          <h3 className="type-label text-muted-foreground">{name}</h3>
          <ul className="divide-y divide-border/70">
            {items.map((service) => (
              <li key={service.id}>
                <ServiceRow service={service} shopSlug={shopSlug} icon={categoryIconFor(categoryOf(service))} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
