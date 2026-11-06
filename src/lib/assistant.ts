import type { Area, ServiceCategory } from '@/types/catalog'
import type { Service, ServicePrice, ShopDetails, ShopSummary } from '@/types/business'
import type { AssistantReply, AssistantShopResult } from '@/types/assistant'
import { toDateKey, weekdayOf } from '@/lib/datetime'
import { formatPeso } from '@/lib/format'
import { describeOpenStatus, getOpenStatus, hasOpeningHours, weeklySchedule } from '@/lib/opening-hours'

export interface AssistantContext {
  categories: readonly ServiceCategory[]
  areas: readonly Area[]
  shops: readonly ShopSummary[]
}

export interface FindIntent {
  kind: 'find'
  categorySlug?: string
  areaSlug?: string
  openNow?: boolean
  priceMax?: number
  nearMe?: boolean
  /** Leftover tokens, for the q= search param. */
  keywords: string[]
}

export type AssistantIntent =
  | FindIntent
  | { kind: 'shop_question'; shopSlug: string; topic: 'hours' | 'prices' | 'policies' }
  | { kind: 'greeting' }
  | { kind: 'unknown' }

type ShopTopic = 'hours' | 'prices' | 'policies'

// Same normalisation as the shop search (shops.service.ts): lowercase, accents and apostrophes stripped.
function normalize(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '').toLowerCase()
}

/** Normalised, `&` read as "and", punctuation turned into single spaces, padded so phrases match whole words. */
function squash(text: string) {
  const words = normalize(text)
    .replace(/(\d),(?=\d{3}\b)/g, '$1')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
  return ` ${words} `
}

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Whole-word match of a squashed phrase, allowing a plural ("salons"). */
function phraseRegex(phrase: string) {
  return new RegExp(`(?<= )${escapeRegex(phrase)}(?:e?s)?(?= )`)
}

const topicWords: Record<ShopTopic, string[]> = {
  hours: ['what time', 'open', 'opens', 'opening', 'close', 'closes', 'closing', 'hours'],
  prices: ['price', 'prices', 'how much', 'cost', 'magkano'],
  policies: ['policy', 'policies', 'cancel', 'cancellation', 'cancelling', 'deposit', 'no show', 'noshow'],
}

const greetingWords = new Set(['hi', 'hello', 'hey', 'kumusta', 'there', 'po'])

const nearMePhrases = ['near me', 'nearby', 'close by', 'malapit']
const openNowPhrases = ['open now', 'open today']
const cheapWords = ['cheap', 'mura']
const cheapPriceMax = 300 // the lowest band in priceOptions (explore-params.ts)
const priceCeiling = /(?<= )(?:under|below|less than)\s+(\d+)(?= )/

/** Words that carry no search meaning, dropped from the leftover keywords. */
const fillerWords = new Set(
  (
    'a an the in at on for of to me my i we you is are am be do does did there any some please find show looking look ' +
    'want need get can could would like with near around and or what where which who how that this it its na sa ang ng ' +
    'mga ba ko yung'
  ).split(' '),
)

/** Words that trail a shop's name without identifying it ("The Good Cut Barbershop" is "the good cut"). */
const genericShopWords = new Set([
  'barbershop',
  'barber',
  'shop',
  'salon',
  'spa',
  'studio',
  'nails',
  'parlor',
  'parlour',
])

/** What a customer might call a top-level category, by its slug. Skipped when the catalog lacks that slug. */
const categorySynonyms: ReadonlyArray<[phrase: string, slug: string]> = [
  ['haircut', 'barber'],
  ['barber shop', 'barber'],
  ['barbershop', 'barber'],
  ['massage', 'spa-massage'],
  ['manicure', 'nails'],
  ['pedicure', 'nails'],
]

/** The squashed names a shop can be called by: full name, without "the", without trailing generic words. */
function shopAliases(name: string): string[] {
  const words = squash(name).trim().split(' ')
  const aliases = new Set([words.join(' ')])
  const withoutThe = words[0] === 'the' ? words.slice(1) : words
  aliases.add(withoutThe.join(' '))
  const core = [...withoutThe]
  while (core.length > 1 && genericShopWords.has(core.at(-1) ?? '')) core.pop()
  aliases.add(core.join(' '))
  return [...aliases].filter((alias) => alias.length >= 4)
}

function findShop(text: string, shops: readonly ShopSummary[]) {
  let best: { shop: ShopSummary; alias: string } | undefined
  for (const shop of shops) {
    for (const alias of shopAliases(shop.name)) {
      if (phraseRegex(alias).test(text) && (!best || alias.length > best.alias.length)) best = { shop, alias }
    }
  }
  return best
}

function findTopic(text: string): ShopTopic | undefined {
  // "close by" means nearby, not closing time.
  const scanned = text.replace(' close by ', ' ')
  let earliest: { topic: ShopTopic; index: number } | undefined
  for (const topic of Object.keys(topicWords) as ShopTopic[]) {
    for (const word of topicWords[topic]) {
      const index = scanned.search(phraseRegex(word))
      if (index !== -1 && (!earliest || index < earliest.index)) earliest = { topic, index }
    }
  }
  return earliest?.topic
}

/** Removes the first whole-word match of any phrase; reports whether one was found. */
function consume(state: { text: string }, phrases: readonly string[]) {
  let found = false
  for (const phrase of phrases) {
    const pattern = phraseRegex(phrase)
    if (pattern.test(state.text)) {
      state.text = state.text.replace(pattern, ' ')
      found = true
    }
  }
  return found
}

function matchCategory(state: { text: string }, categories: readonly ServiceCategory[]) {
  const live = categories.filter((category) => category.status === 'active')
  const candidates = [
    ...live.map((category) => ({
      phrase: squash(category.name).trim(),
      slug: category.slug,
      sub: !!category.parentId,
    })),
    ...categorySynonyms
      .filter(([, slug]) => live.some((category) => category.slug === slug))
      .map(([phrase, slug]) => ({ phrase, slug, sub: false })),
  ].sort((a, b) => Number(b.sub) - Number(a.sub) || b.phrase.length - a.phrase.length)

  let slug: string | undefined
  for (const candidate of candidates) {
    if (consume(state, [candidate.phrase])) slug ??= candidate.slug
  }
  return slug
}

function matchArea(state: { text: string }, areas: readonly Area[]) {
  let slug: string | undefined
  const byLength = [...areas].sort((a, b) => b.name.length - a.name.length)
  for (const area of byLength) {
    if (consume(state, [squash(area.name).trim()])) slug ??= area.slug
  }
  return slug
}

function matchPrice(state: { text: string }) {
  const explicit = priceCeiling.exec(state.text)
  if (explicit) {
    state.text = state.text.replace(priceCeiling, ' ')
    consume(state, cheapWords)
    return Number(explicit[1])
  }
  return consume(state, cheapWords) ? cheapPriceMax : undefined
}

function keywordsFrom(text: string) {
  return text.split(' ').filter((word) => word && !fillerWords.has(word) && !greetingWords.has(word))
}

export function parseMessage(message: string, context: AssistantContext): AssistantIntent {
  const state = { text: squash(message) }

  const shop = findShop(state.text, context.shops)
  if (shop) {
    const topic = findTopic(state.text.replace(phraseRegex(shop.alias), ' '))
    if (topic) return { kind: 'shop_question', shopSlug: shop.shop.slug, topic }
    consume(state, [shop.alias])
  }

  const tokens = state.text.trim().split(' ').filter(Boolean)
  if (!shop && tokens.length > 0 && tokens.every((token) => greetingWords.has(token))) return { kind: 'greeting' }

  const categorySlug = matchCategory(state, context.categories)
  const areaSlug = matchArea(state, context.areas)
  const nearMe = consume(state, nearMePhrases) || undefined
  const openNow = consume(state, openNowPhrases) || consume(state, ['open']) || undefined
  const priceMax = matchPrice(state)

  if (!shop && !categorySlug && !areaSlug && !nearMe && !openNow && priceMax === undefined) return { kind: 'unknown' }

  return {
    kind: 'find',
    categorySlug,
    areaSlug,
    openNow,
    priceMax,
    nearMe,
    keywords: shop ? [normalize(shop.shop.name), ...keywordsFrom(state.text)] : keywordsFrom(state.text),
  }
}

const maxShownShops = 3
const maxListedServices = 5
const estimateNote = 'an estimate until the shop confirms'

/** /explore URL carrying the intent's filters, using Explore's own URL keys. Near me adds nothing: location stays on the device. */
export function exploreHrefForIntent(intent: FindIntent): string {
  const params = new URLSearchParams()
  if (intent.keywords.length > 0) params.set('q', intent.keywords.join(' '))
  if (intent.categorySlug) params.set('category', intent.categorySlug)
  if (intent.areaSlug) params.set('area', intent.areaSlug)
  if (intent.priceMax) params.set('price', String(intent.priceMax))
  if (intent.openNow) params.set('open', '1')
  const query = params.toString()
  return query ? `/explore?${query}` : '/explore'
}

const words = (slug: string) => slug.replace(/-/g, ' ')
const titleCase = (text: string) => text.replace(/(^|\s)[a-z]/g, (match) => match.toUpperCase())

/** The area's real name when a result carries it, otherwise its slug made readable. */
function areaLabel(slug: string, results: readonly AssistantShopResult[]) {
  return results.find((result) => result.shop.area.slug === slug)?.shop.area.name ?? titleCase(words(slug))
}

/** Price as spoken: only fixed prices are exact; from/range are estimates; quote is never a number. */
function describePrice(price: ServicePrice) {
  switch (price.type) {
    case 'fixed':
      return formatPeso(price.amount)
    case 'from':
      return `from ${formatPeso(price.amount)}, ${estimateNote}`
    case 'range':
      return `${formatPeso(price.amount)} to ${formatPeso(price.maxAmount)}, ${estimateNote}`
    case 'quote':
      return 'price on consultation'
  }
}

export function composeFindReply(intent: FindIntent, results: AssistantShopResult[], total: number): AssistantReply {
  const shops = results.slice(0, maxShownShops)
  const noun = intent.categorySlug ? `${words(intent.categorySlug)} ` : ''
  const area = intent.areaSlug ? ` in ${areaLabel(intent.areaSlug, results)}` : ''
  const price = intent.priceMax ? ` under ${formatPeso(intent.priceMax)}` : ''
  const keywords = intent.keywords.length > 0 ? ` matching "${intent.keywords.join(' ')}"` : ''
  const scope = `${area}${price}${keywords}${intent.openNow ? ', open right now' : ''}`

  if (total === 0) {
    const asked = `${noun}shops${scope}`
    const loosen = []
    if (intent.openNow) loosen.push('dropping "open now"')
    if (intent.priceMax) loosen.push('raising the price limit')
    if (intent.areaSlug) loosen.push('searching all of Davao City')
    const advice = loosen.length > 0 ? `Try ${loosen.join(' or ')}.` : 'Try a different category or fewer keywords.'
    const suggestions = []
    if (intent.openNow) suggestions.push(`${noun}shops${area}${price}`.trim())
    if (intent.areaSlug) suggestions.push(`${noun}shops`.trim())
    return { text: `I couldn't find any ${asked}. ${advice}`, shops: [], suggestions }
  }

  const count = `${total} ${noun}${total === 1 ? 'shop' : 'shops'}${scope}`
  const more = total > shops.length ? ` Showing ${shops.length} of them.` : ''
  const first = shops[0]
  const priced = first?.service
    ? ` ${first.shop.name} offers ${first.service.name}: ${describePrice(first.service.price)}.`
    : ''
  return {
    text: `I found ${count}.${more}${priced}`,
    shops,
    exploreHref: exploreHrefForIntent(intent),
    suggestions: [],
  }
}

function summaryOf(shop: ShopDetails): ShopSummary {
  return {
    id: shop.id,
    slug: shop.slug,
    name: shop.name,
    categoryIds: shop.categoryIds,
    area: shop.area,
    address: shop.address,
    coordinates: shop.coordinates,
    coverPhoto: shop.photos.find((photo) => photo.kind === 'cover'),
    rating: shop.rating,
    verified: shop.verified,
    featured: shop.featured,
    bookingMethod: shop.bookingMethod,
    hours: shop.hours,
    closures: shop.closures,
    priceFrom: shop.priceFrom,
    serviceCount: shop.serviceCount,
  }
}

function describeHours(shop: ShopDetails, now: Date) {
  if (!hasOpeningHours(shop.hours)) return `Opening hours not provided for ${shop.name}.`
  const status = describeOpenStatus(getOpenStatus(shop.hours, shop.closures, now), now)
  const today = weeklySchedule(shop.hours).find((row) => row.weekday === weekdayOf(toDateKey(now)))
  const hours = today && today.ranges.length > 0 ? today.ranges.join(', ') : 'closed'
  return `${shop.name} is ${status.label.toLowerCase()} right now${status.detail ? ` (${status.detail})` : ''}. Today, ${today?.name}: ${hours}.`
}

function describePrices(shop: ShopDetails, services: Service[]) {
  const listed = services.filter((service) => service.active).slice(0, maxListedServices)
  if (listed.length === 0) return `${shop.name} has no services listed yet, so I have no prices to share.`
  const lines = listed.map((service) => `${service.name}: ${describePrice(service.price)}`)
  const estimates = listed.some((service) => service.price.type === 'from' || service.price.type === 'range')
  return `Prices at ${shop.name}: ${lines.join('; ')}.${estimates ? ' Prices marked as estimates are confirmed by the shop.' : ''}`
}

function describePolicies(shop: ShopDetails) {
  const { cancellation, noShow, deposit } = shop.policies
  const line = (label: string, text?: string) => `${label}: ${text?.trim().replace(/\.$/, '') || 'not provided'}.`
  return `${shop.name} policies. ${line('Cancellation', cancellation)} ${line('No-show', noShow)} ${line('Deposit', deposit)}`
}

export function composeShopAnswer(
  topic: ShopTopic,
  shop: ShopDetails,
  services: Service[],
  now: Date = new Date(),
): AssistantReply {
  const text =
    topic === 'hours'
      ? describeHours(shop, now)
      : topic === 'prices'
        ? describePrices(shop, services)
        : describePolicies(shop)
  return { text, shops: [{ shop: summaryOf(shop) }], suggestions: [] }
}

export function composeUnknownReply(suggestions: string[]): AssistantReply {
  return {
    text: "I'm not sure what you're looking for. I can find shops by service, area, price or whether they're open, and answer questions about a shop's hours, prices or policies.",
    shops: [],
    suggestions,
  }
}

export function composeGreeting(suggestions: string[]): AssistantReply {
  return {
    text: "Hi! Tell me what you need and where, and I can find shops in Davao City. You can also ask about a shop's hours, prices or policies.",
    shops: [],
    suggestions,
  }
}
