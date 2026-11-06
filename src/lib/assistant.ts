import type { Area, ServiceCategory } from '@/types/catalog'
import type { ShopSummary } from '@/types/business'

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
