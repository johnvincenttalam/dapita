import type { LucideIcon } from 'lucide-react'
import {
  BlocksIcon,
  CalendarCheckIcon,
  CalendarDaysIcon,
  ChartLineIcon,
  CompassIcon,
  ContactIcon,
  CreditCardIcon,
  FlagIcon,
  FormInputIcon,
  HeartIcon,
  HomeIcon,
  LayoutDashboardIcon,
  MessageCircleIcon,
  MessagesSquareIcon,
  ScissorsIcon,
  ScrollTextIcon,
  SettingsIcon,
  ShieldCheckIcon,
  StarIcon,
  StoreIcon,
  TagIcon,
  TagsIcon,
  UserIcon,
  UsersIcon,
  UsersRoundIcon,
} from 'lucide-react'

/** Delivery priority from the project documentation: P0 = MVP, P1/P2 = later releases. */
export type Priority = 'P0' | 'P1' | 'P2'

export interface NavItem {
  title: string
  to: string
  icon: LucideIcon
  description?: string
  /** Only active on an exact match (index routes such as `/business`). */
  end?: boolean
  /** Items after P0 still link to their planned page and are marked "Soon". */
  priority?: Priority
  /** Items waiting for the user, e.g. booking requests; shown as a badge when above 0. */
  count?: number
  /** What the count is, for screen readers: ", 3 waiting". Defaults to "waiting". */
  countLabel?: string
}

export interface NavGroup {
  /** Shown above the group in sidebars. Omit for a single unlabelled list, as in the design. */
  label?: string
  items: NavItem[]
}

export function isUpcoming(item: NavItem) {
  return item.priority !== undefined && item.priority !== 'P0'
}

/**
 * Single source of truth for navigation: the header, bottom tab bar, sidebars,
 * footer and command menu all read from here.
 */

/** Customer bottom tab bar (design screen 3). On desktop all but Profile appear in the header. */
export const customerTabs: NavItem[] = [
  { title: 'Home', to: '/', icon: HomeIcon, end: true, description: 'Discover services near you' },
  { title: 'Explore', to: '/explore', icon: CompassIcon, description: 'Search and map' },
  { title: 'Bookings', to: '/bookings', icon: CalendarDaysIcon, description: 'Your appointments' },
  { title: 'Inbox', to: '/inbox', icon: MessageCircleIcon, description: 'Messages with shops' },
  { title: 'Profile', to: '/account', icon: UserIcon, description: 'Your account' },
]

export const headerNav = customerTabs.filter((item) => item.to !== '/account')

/** Customer account area (signed-in customer dashboard). */
export const accountNav: NavItem[] = [
  { title: 'My bookings', to: '/bookings', icon: CalendarDaysIcon },
  { title: 'Inbox', to: '/inbox', icon: MessageCircleIcon },
  { title: 'Favorites', to: '/favorites', icon: HeartIcon, priority: 'P1' },
  { title: 'Profile', to: '/account', icon: UserIcon, end: true },
  { title: 'Privacy & data', to: '/account/privacy', icon: ShieldCheckIcon },
]

/**
 * Merchant dashboard (design screen 12), in the design's order. "Messages",
 * "Business profile" and "Plan & billing" are added because the documentation
 * requires them (plan §11.1 C8).
 */
export const merchantNav: NavGroup[] = [
  {
    items: [
      { title: 'Dashboard', to: '/business', icon: LayoutDashboardIcon, end: true, description: 'Business overview' },
      {
        title: 'Bookings',
        to: '/business/bookings',
        icon: CalendarCheckIcon,
        description: 'Requests and appointments',
      },
      { title: 'Calendar', to: '/business/calendar', icon: CalendarDaysIcon, description: 'Day and week schedule' },
      { title: 'Messages', to: '/business/messages', icon: MessagesSquareIcon, description: 'Customer inquiries' },
      { title: 'Services', to: '/business/services', icon: ScissorsIcon, description: 'Service menu and prices' },
      { title: 'Staff', to: '/business/staff', icon: UsersRoundIcon, priority: 'P1' },
      { title: 'Customers', to: '/business/customers', icon: ContactIcon, priority: 'P1' },
      { title: 'Reviews', to: '/business/reviews', icon: StarIcon, priority: 'P1' },
      { title: 'Promotions', to: '/business/promotions', icon: TagIcon, priority: 'P1' },
      { title: 'Analytics', to: '/business/insights', icon: ChartLineIcon, priority: 'P1' },
      { title: 'Business profile', to: '/business/profile', icon: StoreIcon, description: 'Public listing' },
      { title: 'Plan & billing', to: '/business/billing', icon: CreditCardIcon, priority: 'P1' },
      { title: 'Settings', to: '/business/settings', icon: SettingsIcon, description: 'Account and policies' },
    ],
  },
]

/** Admin console (no design yet; follows the merchant dashboard's visual language). */
export const adminNav: NavGroup[] = [
  {
    items: [
      { title: 'Overview', to: '/admin', icon: LayoutDashboardIcon, end: true, description: 'Operations overview' },
      { title: 'Merchants', to: '/admin/merchants', icon: StoreIcon, description: 'Listing approvals' },
      { title: 'Categories', to: '/admin/categories', icon: TagsIcon, description: 'Service taxonomy' },
      { title: 'Reports & cases', to: '/admin/reports', icon: FlagIcon, description: 'Support and moderation' },
      { title: 'Users', to: '/admin/users', icon: UsersIcon, description: 'Accounts' },
      { title: 'Logs', to: '/admin/logs', icon: ScrollTextIcon, description: 'Notification failures' },
      { title: 'Plans', to: '/admin/plans', icon: CreditCardIcon, priority: 'P1' },
    ],
  },
]

export interface FooterColumn {
  heading: string
  links: { title: string; to: string }[]
}

export const footerNav: FooterColumn[] = [
  {
    heading: 'Discover',
    links: [
      { title: 'Explore near you', to: '/explore' },
      { title: 'Barbers', to: '/categories/barber' },
      { title: 'Salons', to: '/categories/salon' },
      { title: 'Spa & massage', to: '/categories/spa-massage' },
    ],
  },
  {
    heading: 'For business',
    links: [
      { title: 'List your business', to: '/business/sign-up' },
      { title: 'Merchant dashboard', to: '/business' },
      { title: 'Merchant policy', to: '/legal/merchant-policy' },
    ],
  },
  {
    heading: 'Help',
    links: [
      { title: 'Support', to: '/support' },
      { title: 'Terms of use', to: '/legal/terms' },
      { title: 'Privacy notice', to: '/legal/privacy' },
    ],
  },
]

/** Template reference pages, registered in development builds only. */
export const devNav: NavGroup[] = [
  {
    label: 'Developer reference',
    items: [
      { title: 'Overview', to: '/dev', icon: HomeIcon, end: true },
      { title: 'Components', to: '/dev/components', icon: BlocksIcon },
      { title: 'Forms', to: '/dev/forms', icon: FormInputIcon },
      { title: 'Dashboard demo', to: '/dev/dashboard', icon: LayoutDashboardIcon },
      { title: 'Settings demo', to: '/dev/settings', icon: SettingsIcon },
    ],
  },
]
