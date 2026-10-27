import { addDays } from '@/lib/datetime'
import type { Business, Service, ServicePrice, StaffMember, Weekday, WeeklyHours } from '@/types/business'
import type { DateKey, ID, TimeOfDay } from '@/types/common'

// MOCK: fictional Davao City businesses for the prototype. Names and services of
// the first four come from the design reference; the rest are invented. Cover
// photos are AI-generated stand-ins (plan Q6, §13.9). There are no ratings
// (reviews are P1, and doc §9.3 forbids inventing them) and no phone numbers, so
// nobody real is ever contacted from the demo.

const SEEDED_AT = '2026-09-01T00:00:00.000Z'

/** Cover photo descriptions by shop slug; files are `public/images/shops/shop-<slug>-cover.webp`. */
const coverAlts: Record<string, string> = {
  'the-good-cut-barbershop': 'A barber cutting a customer’s hair among leather chairs, round mirrors and plants',
  'glow-and-go-beauty-salon': 'A bright salon with a stylist at a hair station and a manicure in progress',
  'serenity-wellness-spa': 'A candlelit massage room with a made-up bed, a rolled towel and an orchid',
  'hilot-and-wellness': 'A hilot room with a floor mat on a woven banig, coconut oil and capiz windows',
  'polished-nail-studio': 'A nail technician painting a client’s nails in front of a wall of pastel polishes',
  'arch-and-lash-studio': 'A technician working on a reclining client’s lashes in a soft-pink studio',
  'bloom-makeup-atelier': 'A makeup vanity with bulb lights, brushes, flowers and a bridal robe on a hanger',
  'clearday-skin-studio': 'A facial treatment bed with a steamer and magnifying lamp beside a sage-green wall',
  'kalma-massage-and-wellness': 'Massage beds by an open window with palm trees and a view of the sea',
  'fade-factory-barbers': 'A barber giving a customer a fade in a shop with a dark green accent wall',
  'studio-mane-hair-salon': 'A colourist applying foils to a client’s hair at a bright salon station',
  'ritz-grooming-lounge': 'Cognac leather barber chairs in a lounge with dark wood and brass fixtures',
}

function coverPhoto(id: ID, slug: string): Business['photos'] {
  const alt = coverAlts[slug]
  if (!alt) return []
  const url = `${import.meta.env.BASE_URL}images/shops/shop-${slug}-cover.webp`
  return [{ id: `ph_${id}_cover`, url, alt, kind: 'cover' }]
}

function weekly(open: TimeOfDay, close: TimeOfDay, closedOn: Weekday[] = []): WeeklyHours {
  const day = (weekday: Weekday) => (closedOn.includes(weekday) ? [] : [{ open, close }])
  return { 0: day(0), 1: day(1), 2: day(2), 3: day(3), 4: day(4), 5: day(5), 6: day(6) }
}

const standardPolicy = (hours: number, version = 1) => ({
  cancellation: `Free cancellation up to ${hours} hours before your appointment. Later cancellations may be refused a future booking.`,
  noShow: 'If you miss your appointment without notice, the shop may decline your next request.',
  version,
})

type BusinessSeed = Omit<Business, 'createdAt' | 'updatedAt' | 'photos' | 'ownerId' | 'closures'> &
  Partial<Pick<Business, 'ownerId' | 'closures' | 'updatedAt'>>

function business(seed: BusinessSeed): Business {
  return {
    ownerId: `usr_owner_${seed.slug}`,
    closures: [],
    photos: coverPhoto(seed.id, seed.slug),
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
    ...seed,
  }
}

export function createSeedBusinesses(today: DateKey): Business[] {
  return [
    business({
      id: 'biz_good_cut',
      slug: 'the-good-cut-barbershop',
      // Matches the "Business owner" prototype account in services/mock/users.ts.
      ownerId: 'usr_merchant',
      name: 'The Good Cut Barbershop',
      description:
        'Modern barbershop offering quality cuts, styling, and grooming services in Davao City. Walk-ins welcome when chairs are free; requests get priority.',
      categoryIds: ['cat_barber'],
      areaId: 'area_poblacion',
      address: '118 C.M. Recto St, Poblacion, Davao City',
      coordinates: { lat: 7.0719, lng: 125.6134 },
      status: 'approved',
      bookingMethod: 'request',
      verified: true,
      featured: true,
      hours: weekly('10:00', '21:00'),
      closures: [
        {
          id: 'cl_good_cut_training',
          startDate: addDays(today, 10),
          endDate: addDays(today, 10),
          reason: 'Team training day',
        },
      ],
      policies: standardPolicy(3, 2),
    }),
    business({
      id: 'biz_glow_go',
      slug: 'glow-and-go-beauty-salon',
      name: 'Glow & Go Beauty Salon',
      description:
        'Friendly neighbourhood salon for cuts, colour, keratin and nail care, a short walk from the Lanang business district.',
      categoryIds: ['cat_salon', 'cat_nails'],
      areaId: 'area_lanang',
      address: 'Unit 4, Km 7 Lanang, Davao City',
      coordinates: { lat: 7.1041, lng: 125.6352 },
      status: 'approved',
      bookingMethod: 'request',
      verified: true,
      featured: true,
      hours: weekly('09:00', '19:00', [1]),
      policies: standardPolicy(6),
    }),
    business({
      id: 'biz_serenity',
      slug: 'serenity-wellness-spa',
      name: 'Serenity Wellness Spa',
      description:
        'Calm, private treatment rooms for massage, facials and body scrubs. Open late for after-work appointments.',
      categoryIds: ['cat_spa', 'cat_wellness'],
      areaId: 'area_buhangin',
      address: '22 Buhangin Rd, Buhangin, Davao City',
      coordinates: { lat: 7.1163, lng: 125.6131 },
      status: 'approved',
      bookingMethod: 'request',
      verified: false,
      featured: true,
      hours: weekly('12:00', '24:00'),
      policies: { ...standardPolicy(12), deposit: 'No deposit is taken online. Pay at the spa after your treatment.' },
    }),
    business({
      id: 'biz_hilot',
      slug: 'hilot-and-wellness',
      name: 'Hilot & Wellness',
      description: 'Traditional Filipino hilot, ventosa and reflexology by experienced therapists.',
      categoryIds: ['cat_wellness', 'cat_spa'],
      areaId: 'area_bajada',
      address: 'J.P. Laurel Ave, Bajada, Davao City',
      coordinates: { lat: 7.0932, lng: 125.6098 },
      status: 'approved',
      bookingMethod: 'request',
      verified: true,
      featured: false,
      hours: weekly('10:00', '22:00'),
      policies: standardPolicy(6),
    }),
    // Submitted for review and not public yet: the admin approval queue's sample.
    business({
      id: 'biz_kulot',
      slug: 'kulot-studio',
      name: 'Kulot Studio',
      description: 'Curly-hair specialists: dry cuts, curl-friendly colour and treatments, a short walk from Bajada.',
      categoryIds: ['cat_salon'],
      areaId: 'area_bajada',
      address: 'J.P. Laurel Ave, Bajada, Davao City',
      status: 'pending_review',
      updatedAt: `${addDays(today, -1)}T01:30:00.000Z`,
      bookingMethod: 'request',
      verified: false,
      featured: false,
      hours: weekly('10:00', '19:00', [1]),
      policies: standardPolicy(6),
    }),
    business({
      id: 'biz_polished',
      slug: 'polished-nail-studio',
      name: 'Polished Nail Studio',
      description: 'Gel manicures, pedicures and hand-painted nail art in a bright studio near Ecoland.',
      categoryIds: ['cat_nails'],
      areaId: 'area_ecoland',
      address: 'Quimpo Blvd, Ecoland, Davao City',
      coordinates: { lat: 7.0551, lng: 125.6029 },
      status: 'approved',
      bookingMethod: 'request',
      verified: false,
      featured: false,
      hours: weekly('10:00', '20:00', [0]),
      policies: standardPolicy(4),
    }),
    business({
      id: 'biz_arch_lash',
      slug: 'arch-and-lash-studio',
      name: 'Arch & Lash Studio',
      description: 'Brow shaping, lamination, lash lifts and extensions by certified technicians.',
      categoryIds: ['cat_brows', 'cat_makeup'],
      areaId: 'area_poblacion',
      address: 'San Pedro St, Poblacion, Davao City',
      coordinates: { lat: 7.0748, lng: 125.6119 },
      status: 'approved',
      bookingMethod: 'request',
      verified: true,
      featured: false,
      hours: weekly('10:00', '19:00', [2]),
      policies: standardPolicy(12),
    }),
    business({
      id: 'biz_bloom',
      slug: 'bloom-makeup-atelier',
      name: 'Bloom Makeup Atelier',
      description: 'Event, debut and bridal makeup. Home service can be arranged after you send a request.',
      categoryIds: ['cat_makeup'],
      areaId: 'area_matina',
      address: 'MacArthur Hwy, Matina, Davao City',
      coordinates: { lat: 7.0602, lng: 125.5961 },
      status: 'approved',
      bookingMethod: 'request',
      verified: false,
      featured: true,
      hours: weekly('08:00', '18:00', [0]),
      policies: { ...standardPolicy(48), deposit: 'Bridal bookings need a deposit, agreed directly with the artist.' },
    }),
    business({
      id: 'biz_clearday',
      slug: 'clearday-skin-studio',
      name: 'Clearday Skin Studio',
      description: 'Facials and non-invasive skin treatments with a consultation before every first visit.',
      categoryIds: ['cat_skin'],
      areaId: 'area_bajada',
      address: 'Dacudao Ave, Bajada, Davao City',
      coordinates: { lat: 7.0907, lng: 125.6127 },
      status: 'approved',
      bookingMethod: 'request',
      verified: true,
      featured: false,
      hours: weekly('11:00', '20:00', [0]),
      policies: standardPolicy(24),
    }),
    business({
      id: 'biz_kalma',
      slug: 'kalma-massage-and-wellness',
      name: 'Kalma Massage & Wellness',
      description: 'Affordable Swedish, shiatsu and prenatal massage near the Talomo coast.',
      categoryIds: ['cat_spa', 'cat_wellness'],
      areaId: 'area_talomo',
      address: 'Talomo Rd, Talomo, Davao City',
      coordinates: { lat: 7.0446, lng: 125.5812 },
      status: 'approved',
      bookingMethod: 'request',
      verified: false,
      featured: false,
      hours: weekly('13:00', '23:00'),
      policies: standardPolicy(6),
    }),
    business({
      id: 'biz_fade_factory',
      slug: 'fade-factory-barbers',
      name: 'Fade Factory Barbers',
      description: 'Skin fades, tapers and beard sculpting. Quick service for students and office workers.',
      categoryIds: ['cat_barber'],
      areaId: 'area_obrero',
      address: 'Bonifacio St, Obrero, Davao City',
      coordinates: { lat: 7.0841, lng: 125.6163 },
      status: 'approved',
      bookingMethod: 'request',
      verified: false,
      featured: false,
      hours: { ...weekly('09:00', '20:00'), 0: [{ open: '10:00', close: '18:00' }] },
      policies: standardPolicy(2),
    }),
    business({
      id: 'biz_studio_mane',
      slug: 'studio-mane-hair-salon',
      name: 'Studio Mane Hair Salon',
      description:
        'Colour specialists for balayage, highlights and rebonding, with a free strand test before chemical services.',
      categoryIds: ['cat_salon'],
      areaId: 'area_lanang',
      address: 'J.P. Laurel Ave, Lanang, Davao City',
      coordinates: { lat: 7.1069, lng: 125.6381 },
      status: 'approved',
      bookingMethod: 'request',
      verified: true,
      featured: false,
      hours: weekly('10:00', '20:00', [3]),
      policies: standardPolicy(24),
    }),
    // Waiting for admin review: not visible in public search (doc §7.4).
    business({
      id: 'biz_ritz_grooming',
      slug: 'ritz-grooming-lounge',
      name: 'Ritz Grooming Lounge',
      description: 'Premium grooming lounge with private chairs, hot-towel shaves and scalp treatments.',
      categoryIds: ['cat_barber'],
      areaId: 'area_matina',
      address: 'Matina Crossing, Matina, Davao City',
      coordinates: { lat: 7.0571, lng: 125.5925 },
      status: 'pending_review',
      updatedAt: `${addDays(today, -1)}T01:30:00.000Z`,
      bookingMethod: 'request',
      verified: false,
      featured: false,
      hours: weekly('10:00', '20:00'),
      policies: standardPolicy(6),
    }),
  ]
}

type ServiceSeed = [
  id: string,
  categoryId: ID,
  name: string,
  price: ServicePrice,
  durationMinutes: number,
  extra?: Partial<Service>,
]

const fixed = (amount: number): ServicePrice => ({ type: 'fixed', amount })
const from = (amount: number): ServicePrice => ({ type: 'from', amount })
const range = (amount: number, maxAmount: number): ServicePrice => ({ type: 'range', amount, maxAmount })
const quote: ServicePrice = { type: 'quote' }

const serviceSeeds: Record<ID, ServiceSeed[]> = {
  biz_good_cut: [
    [
      'svc_mens_haircut',
      'sub_haircut',
      'Men’s Haircut',
      fixed(250),
      30,
      { featured: true, description: 'Consultation, cut, wash and style.' },
    ],
    [
      'svc_hair_beard',
      'sub_beard',
      'Hair + Beard Trim',
      fixed(350),
      45,
      { featured: true, description: 'Haircut with a beard shape-up and hot towel.' },
    ],
    [
      'svc_cut_styling',
      'sub_haircut',
      'Haircut & Styling',
      fixed(450),
      60,
      { description: 'Cut plus styling with your choice of product.' },
    ],
    [
      'svc_kids_cut',
      'sub_haircut',
      'Kids’ Haircut (12 and under)',
      fixed(180),
      30,
      { requirements: 'A parent or guardian must stay during the appointment.' },
    ],
    ['svc_hot_shave', 'sub_beard', 'Hot Towel Shave', fixed(200), 30],
    [
      'svc_mens_color',
      'sub_haircut',
      'Men’s Hair Color',
      from(800),
      90,
      { description: 'Price depends on hair length and product.' },
    ],
  ],
  biz_kulot: [
    ['svc_kulot_curly', 'sub_styling', 'Curly Cut', fixed(600), 60, { description: 'A dry cut, curl by curl.' }],
    ['svc_kulot_color', 'sub_color', 'Curl-friendly Colour', from(1800), 150],
  ],
  biz_glow_go: [
    ['svc_gg_cut', 'sub_styling', 'Women’s Haircut & Blow-dry', fixed(550), 60, { featured: true }],
    [
      'svc_gg_color',
      'sub_color',
      'Hair Color',
      from(1500),
      120,
      { featured: true, requirements: 'Strand test needed 48 hours before for first-time colour.' },
    ],
    ['svc_gg_keratin', 'sub_treatment', 'Keratin Treatment', range(2500, 4500), 150],
    ['svc_gg_mani', 'sub_manicure', 'Classic Manicure', fixed(250), 45],
    ['svc_gg_pedi', 'sub_pedicure', 'Classic Pedicure', fixed(300), 60],
  ],
  biz_serenity: [
    ['svc_sr_swedish', 'sub_massage', 'Swedish Massage', fixed(600), 60, { featured: true }],
    ['svc_sr_stone', 'sub_massage', 'Hot Stone Massage', fixed(950), 90, { featured: true }],
    ['svc_sr_facial', 'sub_facial', 'Signature Facial', fixed(800), 60],
    ['svc_sr_scrub', 'sub_scrub', 'Body Scrub', fixed(700), 60],
  ],
  biz_hilot: [
    ['svc_hl_hilot', 'sub_hilot', 'Traditional Hilot', fixed(500), 60, { featured: true }],
    ['svc_hl_ventosa', 'sub_hilot', 'Ventosa + Hilot', fixed(750), 90],
    ['svc_hl_foot', 'sub_reflexology', 'Foot Reflexology', fixed(350), 45, { featured: true }],
  ],
  biz_polished: [
    ['svc_pn_gel', 'sub_manicure', 'Gel Manicure', fixed(450), 60, { featured: true }],
    ['svc_pn_art', 'sub_nail_art', 'Nail Art (per set)', from(150), 30],
    ['svc_pn_pedi', 'sub_pedicure', 'Spa Pedicure', fixed(400), 60],
    ['svc_pn_removal', 'sub_manicure', 'Gel Removal', fixed(150), 20],
  ],
  biz_arch_lash: [
    ['svc_al_classic', 'sub_lashes', 'Classic Lash Extensions', fixed(900), 90, { featured: true }],
    ['svc_al_shape', 'sub_brows', 'Brow Shaping', fixed(250), 30, { featured: true }],
    ['svc_al_lamination', 'sub_brows', 'Brow Lamination', fixed(800), 60],
    ['svc_al_lift', 'sub_lashes', 'Lash Lift & Tint', fixed(700), 60],
  ],
  biz_bloom: [
    ['svc_bm_event', 'sub_event_makeup', 'Event Makeup', from(1500), 75, { featured: true }],
    [
      'svc_bm_bridal',
      'sub_bridal',
      'Bridal Makeup',
      quote,
      120,
      { description: 'Includes a trial session. Price depends on the entourage and location.' },
    ],
    ['svc_bm_lesson', 'sub_event_makeup', 'Personal Makeup Lesson', fixed(2000), 120],
  ],
  biz_clearday: [
    ['svc_cd_hydra', 'sub_facial_care', 'Hydrating Facial', fixed(900), 60, { featured: true }],
    ['svc_cd_acne', 'sub_facial_care', 'Acne Clearing Facial', fixed(1100), 75],
    [
      'svc_cd_micro',
      'sub_skin_treatment',
      'Microdermabrasion',
      fixed(1500),
      60,
      { requirements: 'Avoid retinol products for 3 days before your session.' },
    ],
  ],
  biz_kalma: [
    ['svc_km_swedish', 'sub_massage', 'Swedish Massage', fixed(450), 60, { featured: true }],
    ['svc_km_shiatsu', 'sub_massage', 'Shiatsu', fixed(550), 60],
    [
      'svc_km_prenatal',
      'sub_massage',
      'Prenatal Massage',
      fixed(650),
      60,
      { requirements: 'Available from the second trimester.' },
    ],
  ],
  biz_fade_factory: [
    ['svc_ff_fade', 'sub_haircut', 'Skin Fade', fixed(220), 40, { featured: true }],
    ['svc_ff_taper', 'sub_haircut', 'Classic Taper', fixed(180), 30],
    ['svc_ff_beard', 'sub_beard', 'Beard Sculpt', fixed(150), 20],
  ],
  biz_studio_mane: [
    ['svc_sm_cut', 'sub_styling', 'Haircut & Style', fixed(400), 60],
    ['svc_sm_balayage', 'sub_color', 'Balayage', range(3500, 6000), 180, { featured: true }],
    ['svc_sm_rebond', 'sub_treatment', 'Rebond', from(2500), 240, { featured: true }],
  ],
  biz_ritz_grooming: [['svc_rz_cut', 'sub_haircut', 'Executive Cut', fixed(600), 45]],
}

/** Services with an AI-generated stand-in photo (plan Q6, §13.9): `public/images/services/service-<id>.webp`. */
const servicesWithPhotos = new Set([
  'svc_mens_haircut',
  'svc_hair_beard',
  'svc_cut_styling',
  'svc_kids_cut',
  'svc_hot_shave',
  'svc_mens_color',
  'svc_gg_cut',
  'svc_gg_color',
  'svc_gg_keratin',
  'svc_gg_mani',
  'svc_gg_pedi',
  'svc_sr_swedish',
  'svc_sr_stone',
  'svc_sr_facial',
  'svc_sr_scrub',
  'svc_hl_hilot',
  'svc_hl_ventosa',
  'svc_hl_foot',
  'svc_pn_gel',
  'svc_pn_art',
  'svc_pn_pedi',
  'svc_pn_removal',
  'svc_al_classic',
  'svc_al_shape',
  'svc_al_lamination',
  'svc_al_lift',
  'svc_bm_event',
  'svc_bm_bridal',
  'svc_bm_lesson',
  'svc_cd_hydra',
  'svc_cd_acne',
  'svc_cd_micro',
  'svc_km_swedish',
  'svc_km_shiatsu',
  'svc_km_prenatal',
  'svc_ff_fade',
  'svc_ff_taper',
  'svc_ff_beard',
  'svc_sm_cut',
  'svc_sm_balayage',
  'svc_sm_rebond',
])

export function createSeedServices(): Service[] {
  return Object.entries(serviceSeeds).flatMap(([businessId, seeds]) =>
    seeds.map(([id, categoryId, name, price, durationMinutes, extra], index) => ({
      id,
      businessId,
      categoryId,
      name,
      price,
      durationMinutes,
      bufferMinutes: 10,
      featured: false,
      active: true,
      sortOrder: index + 1,
      ...(servicesWithPhotos.has(id) && {
        photoUrl: `${import.meta.env.BASE_URL}images/services/service-${id}.webp`,
      }),
      ...extra,
    })),
  )
}

/** AI-generated stand-in portrait for a seeded staff member (plan Q6, §13.9). */
const staffAvatar = (name: string) => `${import.meta.env.BASE_URL}images/staff/staff-${name}.webp`

/** Staff appear only where a shop keeps staff records (plan C15). Names from design screen 6. */
export function createSeedStaff(): StaffMember[] {
  return [
    {
      id: 'stf_ken',
      businessId: 'biz_good_cut',
      displayName: 'Ken',
      title: 'Senior barber',
      avatarUrl: staffAvatar('ken'),
      serviceIds: ['svc_mens_haircut', 'svc_hair_beard', 'svc_cut_styling', 'svc_hot_shave', 'svc_mens_color'],
      active: true,
    },
    {
      id: 'stf_mark',
      businessId: 'biz_good_cut',
      displayName: 'Mark',
      title: 'Barber',
      avatarUrl: staffAvatar('mark'),
      serviceIds: ['svc_mens_haircut', 'svc_hair_beard', 'svc_kids_cut', 'svc_hot_shave'],
      active: true,
    },
    {
      id: 'stf_james',
      businessId: 'biz_good_cut',
      displayName: 'James',
      title: 'Barber',
      avatarUrl: staffAvatar('james'),
      serviceIds: ['svc_mens_haircut', 'svc_cut_styling', 'svc_kids_cut'],
      active: true,
    },
    {
      id: 'stf_lia',
      businessId: 'biz_glow_go',
      displayName: 'Lia',
      title: 'Colourist',
      avatarUrl: staffAvatar('lia'),
      serviceIds: ['svc_gg_cut', 'svc_gg_color', 'svc_gg_keratin'],
      active: true,
    },
    {
      id: 'stf_joy',
      businessId: 'biz_glow_go',
      displayName: 'Joy',
      title: 'Nail technician',
      avatarUrl: staffAvatar('joy'),
      serviceIds: ['svc_gg_mani', 'svc_gg_pedi'],
      active: true,
    },
  ]
}
