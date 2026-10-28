import type { SupportTopic } from '@/schemas/support'

/** The support form, opened on a topic and, where it applies, the shop or booking it's about. */
export function supportHref(topic?: SupportTopic, about?: { shop?: string; booking?: string }) {
  const params = new URLSearchParams()
  if (topic) params.set('topic', topic)
  if (about?.shop) params.set('shop', about.shop)
  if (about?.booking) params.set('booking', about.booking)
  const query = params.toString()
  return query ? `/support?${query}` : '/support'
}
