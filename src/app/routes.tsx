import type { ComponentType } from 'react'
import { redirect, type RouteObject } from 'react-router'

import { InlineRouteErrorBoundary, RouteErrorBoundary } from '@/components/feedback/RouteErrorBoundary'
import { AppLoading, RootLayout } from '@/components/layouts/RootLayout'
import { RequireRole } from '@/features/auth/components/RequireRole'
import { roleGroups } from '@/lib/roles'
import type { PlannedPageMeta, RouteHandle } from '@/types/router'

/** Lazy-loads a page module whose default export is the page component (one JS chunk per page). */
const page = (load: () => Promise<{ default: ComponentType }>) => async () => ({ Component: (await load()).default })

/** Lazy-loads a layout, so e.g. the dashboard shell isn't downloaded by visitors of public pages. */
const layout =
  <TModule,>(load: () => Promise<TModule>, pick: (module: TModule) => ComponentType) =>
  async () => ({ Component: pick(await load()) })

const notFound = page(() => import('@/routes/NotFoundPage'))
const plannedPage = page(() => import('@/routes/PlannedPage'))
const plannedPublicPage = page(() => import('@/routes/PlannedPublicPage'))
const legalPage = page(() => import('@/routes/LegalPage'))

/**
 * TEMPORARY: a documented route whose screen is built in a later phase. The URL, layout,
 * guard and breadcrumb are final; the body is a placeholder describing the planned screen.
 * Replace `planned(...)` with `lazy: page(() => import('@/routes/XPage'))` when building it.
 */
function planned(crumb: string | undefined, meta: PlannedPageMeta, view: 'public' | 'inset' = 'inset') {
  return {
    handle: { crumb, planned: meta } satisfies RouteHandle,
    lazy: view === 'public' ? plannedPublicPage : plannedPage,
  }
}

/** Pathless wrapper so page errors render inside the layout, keeping its navigation usable. */
const withinLayout = (children: RouteObject[]): RouteObject[] => [
  { ErrorBoundary: InlineRouteErrorBoundary, children: [...children, { path: '*', lazy: notFound }] },
]

/** Customer marketplace: public pages plus the signed-in customer area (docs/implementation-plan.md §2.1). */
const marketplaceRoutes: RouteObject[] = [
  { index: true, lazy: page(() => import('@/routes/HomePage')) },
  {
    // List view now; the map view (design screen 4) joins in plan step 10.
    path: 'explore',
    handle: { crumb: 'Explore' } satisfies RouteHandle,
    lazy: page(() => import('@/routes/ExplorePage')),
  },
  {
    path: 'categories/:categorySlug',
    handle: { crumb: 'Category' } satisfies RouteHandle,
    lazy: page(() => import('@/routes/CategoryPage')),
  },
  {
    path: 'shops/:shopSlug',
    handle: { crumb: 'Shop' } satisfies RouteHandle,
    children: [
      { index: true, lazy: page(() => import('@/routes/ShopPage')) },
      {
        path: 'services/:serviceId',
        handle: { crumb: 'Service' } satisfies RouteHandle,
        lazy: page(() => import('@/routes/ServicePage')),
      },
      {
        element: <RequireRole roles={roleGroups.customer} audience="customers" variant="inline" />,
        children: [
          {
            path: 'book',
            handle: { crumb: 'Book' } satisfies RouteHandle,
            lazy: page(() => import('@/routes/BookPage')),
          },
        ],
      },
    ],
  },
  {
    path: 'style-studio',
    ...planned(
      'AI Style Studio',
      {
        title: 'AI Style Studio',
        description: 'Preview a hairstyle or hair color, then find local providers who offer it.',
        priority: 'P1',
        design: '8 · AI Hairstyle Try-On',
        refs: ['AI-01', 'AI-07'],
      },
      'public',
    ),
  },
  {
    path: 'rentals',
    handle: { crumb: 'Gowns & dresses' } satisfies RouteHandle,
    children: [
      {
        index: true,
        ...planned(
          undefined,
          {
            title: 'Gowns & dresses',
            description: 'Rental items by occasion. Launches only once partner inventory can be kept accurate.',
            priority: 'P2',
            design: '9 · Gown/Dress Rental',
          },
          'public',
        ),
      },
      {
        path: ':itemId',
        ...planned(
          'Item',
          { title: 'Rental item', description: 'Sizes, event-date availability and inquiry.', priority: 'P2' },
          'public',
        ),
      },
    ],
  },
  {
    path: 'legal',
    handle: { crumb: 'Legal' } satisfies RouteHandle,
    children: [
      { index: true, loader: () => redirect('/legal/terms') },
      { path: 'terms', handle: { crumb: 'Terms of use' } satisfies RouteHandle, lazy: legalPage },
      { path: 'privacy', handle: { crumb: 'Privacy notice' } satisfies RouteHandle, lazy: legalPage },
      { path: 'merchant-policy', handle: { crumb: 'Merchant policy' } satisfies RouteHandle, lazy: legalPage },
    ],
  },
  {
    path: 'support',
    handle: { crumb: 'Support' } satisfies RouteHandle,
    lazy: page(() => import('@/routes/SupportPage')),
  },
  {
    element: <RequireRole roles={roleGroups.customer} audience="customers" variant="inline" />,
    children: [
      {
        lazy: layout(
          () => import('@/components/layouts/AccountLayout'),
          (m) => m.AccountLayout,
        ),
        children: [
          {
            path: 'bookings',
            handle: { crumb: 'My bookings' } satisfies RouteHandle,
            children: [
              { index: true, lazy: page(() => import('@/routes/MyBookingsPage')) },
              {
                path: ':bookingId',
                handle: { crumb: 'Booking' } satisfies RouteHandle,
                children: [
                  { index: true, lazy: page(() => import('@/routes/BookingDetailPage')) },
                  {
                    path: 'submitted',
                    handle: { crumb: 'Request sent' } satisfies RouteHandle,
                    lazy: page(() => import('@/routes/BookingSubmittedPage')),
                  },
                  {
                    path: 'review',
                    ...planned('Review', {
                      title: 'Write a review',
                      description: 'Rate a completed appointment.',
                      priority: 'P1',
                      refs: ['CUS-09'],
                    }),
                  },
                ],
              },
            ],
          },
          {
            path: 'inbox',
            handle: { crumb: 'Inbox' } satisfies RouteHandle,
            children: [
              { index: true, lazy: page(() => import('@/routes/InboxPage')) },
              {
                path: ':conversationId',
                handle: { crumb: 'Conversation' } satisfies RouteHandle,
                lazy: page(() => import('@/routes/InboxPage')),
              },
            ],
          },
          {
            path: 'account',
            handle: { crumb: 'Profile' } satisfies RouteHandle,
            children: [
              { index: true, lazy: page(() => import('@/routes/ProfilePage')) },
              {
                path: 'privacy',
                handle: { crumb: 'Privacy & data' } satisfies RouteHandle,
                lazy: page(() => import('@/routes/PrivacyPage')),
              },
            ],
          },
          {
            path: 'favorites',
            ...planned('Favorites', {
              title: 'Favorites',
              description: 'Shops you have saved.',
              priority: 'P1',
              refs: ['CUS-07'],
            }),
          },
        ],
      },
    ],
  },
]

/** Welcome and Get started: full-bleed onboarding screens (§2.2, design screens 1–2). */
const welcomeRoutes: RouteObject[] = [
  { path: 'welcome', lazy: page(() => import('@/routes/WelcomePage')) },
  { path: 'get-started', lazy: page(() => import('@/routes/GetStartedPage')) },
]

/** Sign-in, sign-up and account recovery (§2.2). */
const authRoutes: RouteObject[] = [
  {
    path: 'auth',
    children: [
      { index: true, loader: () => redirect('/auth/sign-in') },
      { path: 'sign-in', lazy: page(() => import('@/routes/SignInPage')) },
      { path: 'sign-up', lazy: page(() => import('@/routes/SignUpPage')) },
      { path: 'forgot-password', lazy: page(() => import('@/routes/ForgotPasswordPage')) },
      { path: 'verify', lazy: page(() => import('@/routes/VerifyEmailPage')) },
    ],
  },
  { path: 'business/sign-up', lazy: page(() => import('@/routes/BusinessSignUpPage')) },
]

/** Merchant dashboard (§2.3). Owners and staff only. */
const merchantRoutes: RouteObject[] = [
  { index: true, lazy: page(() => import('@/routes/MerchantDashboardPage')) },
  {
    path: 'onboarding',
    handle: { crumb: 'Set up your listing' } satisfies RouteHandle,
    lazy: page(() => import('@/routes/MerchantOnboardingPage')),
  },
  {
    path: 'bookings',
    handle: { crumb: 'Bookings' } satisfies RouteHandle,
    children: [
      { index: true, lazy: page(() => import('@/routes/MerchantBookingsPage')) },
      {
        path: ':bookingId',
        handle: { crumb: 'Booking details' } satisfies RouteHandle,
        lazy: page(() => import('@/routes/MerchantBookingsPage')),
      },
    ],
  },
  {
    path: 'calendar',
    handle: { crumb: 'Calendar' } satisfies RouteHandle,
    lazy: page(() => import('@/routes/MerchantCalendarPage')),
  },
  {
    path: 'messages',
    handle: { crumb: 'Messages' } satisfies RouteHandle,
    children: [
      { index: true, lazy: page(() => import('@/routes/MerchantMessagesPage')) },
      {
        path: ':conversationId',
        handle: { crumb: 'Conversation' } satisfies RouteHandle,
        lazy: page(() => import('@/routes/MerchantMessagesPage')),
      },
    ],
  },
  {
    path: 'services',
    handle: { crumb: 'Services' } satisfies RouteHandle,
    children: [
      { index: true, lazy: page(() => import('@/routes/MerchantServicesPage')) },
      {
        path: 'new',
        handle: { crumb: 'Add service' } satisfies RouteHandle,
        lazy: page(() => import('@/routes/MerchantServiceEditorPage')),
      },
      {
        path: ':serviceId',
        handle: { crumb: 'Edit service' } satisfies RouteHandle,
        lazy: page(() => import('@/routes/MerchantServiceEditorPage')),
      },
    ],
  },
  {
    path: 'profile',
    handle: { crumb: 'Business profile' } satisfies RouteHandle,
    lazy: page(() => import('@/routes/MerchantProfilePage')),
  },
  {
    path: 'settings',
    handle: { crumb: 'Settings' } satisfies RouteHandle,
    lazy: page(() => import('@/routes/MerchantSettingsPage')),
  },
  {
    path: 'staff',
    ...planned('Staff', {
      title: 'Staff',
      description: 'Staff records and availability.',
      priority: 'P1',
      refs: ['MER-06'],
    }),
  },
  {
    path: 'customers',
    ...planned('Customers', {
      title: 'Customers',
      description: 'Booking details of your customers, limited to what you need.',
      priority: 'P1',
      refs: ['MER-09'],
    }),
  },
  {
    path: 'reviews',
    ...planned('Reviews', {
      title: 'Reviews',
      description: 'Reviews from completed appointments.',
      priority: 'P1',
      refs: ['CUS-09'],
    }),
  },
  {
    path: 'promotions',
    ...planned('Promotions', {
      title: 'Promotions',
      description: 'Promotions and a shareable booking link with QR code.',
      priority: 'P1',
      refs: ['§5.2'],
    }),
  },
  {
    path: 'insights',
    ...planned('Analytics', {
      title: 'Analytics',
      description: 'Requests, confirmation rate, completed bookings and response time.',
      priority: 'P1',
      refs: ['MER-07'],
    }),
  },
  {
    path: 'billing',
    ...planned('Plan & billing', {
      title: 'Plan & billing',
      description: 'Current plan, entitlements and billing history.',
      priority: 'P1',
      refs: ['MER-08'],
    }),
  },
]

/** Admin console (§2.4). Administrators and support only. */
const adminRoutes: RouteObject[] = [
  { index: true, lazy: page(() => import('@/routes/AdminOverviewPage')) },
  {
    path: 'merchants',
    handle: { crumb: 'Merchants' } satisfies RouteHandle,
    children: [
      { index: true, lazy: page(() => import('@/routes/AdminMerchantsPage')) },
      {
        path: ':businessId',
        handle: { crumb: 'Listing review' } satisfies RouteHandle,
        lazy: page(() => import('@/routes/AdminMerchantReviewPage')),
      },
    ],
  },
  {
    path: 'categories',
    handle: { crumb: 'Categories' } satisfies RouteHandle,
    lazy: page(() => import('@/routes/AdminCategoriesPage')),
  },
  {
    path: 'reports',
    handle: { crumb: 'Reports & cases' } satisfies RouteHandle,
    children: [
      { index: true, lazy: page(() => import('@/routes/AdminReportsPage')) },
      {
        path: ':caseId',
        handle: { crumb: 'Case' } satisfies RouteHandle,
        lazy: page(() => import('@/routes/AdminCasePage')),
      },
    ],
  },
  {
    path: 'users',
    handle: { crumb: 'Users' } satisfies RouteHandle,
    lazy: page(() => import('@/routes/AdminUsersPage')),
  },
  {
    path: 'logs',
    handle: { crumb: 'Logs' } satisfies RouteHandle,
    lazy: page(() => import('@/routes/AdminLogsPage')),
  },
  {
    path: 'plans',
    ...planned('Plans', {
      title: 'Plans',
      description: 'Subscription plans and entitlements.',
      priority: 'P1',
      refs: ['ADM-04'],
    }),
  },
]

/** The starter template's reference pages. Registered in development builds only. */
const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: 'dev',
        lazy: layout(
          () => import('@/components/layouts/DevLayout'),
          (m) => m.DevLayout,
        ),
        handle: { crumb: 'Developer reference' } satisfies RouteHandle,
        children: withinLayout([
          { index: true, lazy: page(() => import('@/routes/DevIndexPage')) },
          {
            path: 'components',
            handle: { crumb: 'Components' } satisfies RouteHandle,
            lazy: page(() => import('@/routes/ComponentsPage')),
          },
          {
            path: 'forms',
            handle: { crumb: 'Forms' } satisfies RouteHandle,
            lazy: page(() => import('@/routes/FormsPage')),
          },
          {
            path: 'dashboard',
            handle: { crumb: 'Dashboard demo' } satisfies RouteHandle,
            lazy: page(() => import('@/routes/DashboardPage')),
          },
          {
            path: 'settings',
            handle: { crumb: 'Settings demo' } satisfies RouteHandle,
            lazy: page(() => import('@/routes/SettingsPage')),
          },
        ]),
      },
    ]
  : []

/**
 * Route tree. Layouts are pathless parents so one shell serves many pages; guards are
 * pathless parents too. Add `handle: { crumb }` to include a route in the breadcrumbs.
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    Component: RootLayout,
    ErrorBoundary: RouteErrorBoundary,
    HydrateFallback: AppLoading,
    children: [
      {
        lazy: layout(
          () => import('@/components/layouts/PublicLayout'),
          (m) => m.PublicLayout,
        ),
        handle: { crumb: 'Home' } satisfies RouteHandle,
        children: withinLayout(marketplaceRoutes),
      },
      {
        lazy: layout(
          () => import('@/components/layouts/WelcomeLayout'),
          (m) => m.WelcomeLayout,
        ),
        children: [{ ErrorBoundary: InlineRouteErrorBoundary, children: welcomeRoutes }],
      },
      {
        lazy: layout(
          () => import('@/components/layouts/AuthLayout'),
          (m) => m.AuthLayout,
        ),
        children: [{ ErrorBoundary: InlineRouteErrorBoundary, children: authRoutes }],
      },
      {
        element: <RequireRole roles={roleGroups.merchant} audience="merchants" />,
        children: [
          {
            path: 'business',
            lazy: layout(
              () => import('@/components/layouts/MerchantLayout'),
              (m) => m.MerchantLayout,
            ),
            handle: { crumb: 'Dashboard' } satisfies RouteHandle,
            children: withinLayout(merchantRoutes),
          },
        ],
      },
      {
        element: <RequireRole roles={roleGroups.admin} audience="administrators" />,
        children: [
          {
            path: 'admin',
            lazy: layout(
              () => import('@/components/layouts/AdminLayout'),
              (m) => m.AdminLayout,
            ),
            handle: { crumb: 'Admin' } satisfies RouteHandle,
            children: withinLayout(adminRoutes),
          },
        ],
      },
      ...devRoutes,
    ],
  },
]
