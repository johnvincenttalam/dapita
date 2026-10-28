/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The endpoints the SPA's HTTP services call (src/services/*.service.ts,
| plan §7.3), under /api. The Vite dev server proxies /api here.
|
*/

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import transmit from '@adonisjs/transmit/services/main'
import ApiError from '#exceptions/api_error'

const AuthController = () => import('#controllers/auth_controller')
const CatalogController = () => import('#controllers/catalog_controller')
const ShopsController = () => import('#controllers/shops_controller')
const BookingsController = () => import('#controllers/bookings_controller')
const MerchantBookingsController = () => import('#controllers/merchant_bookings_controller')
const MerchantBusinessesController = () => import('#controllers/merchant_businesses_controller')
const MerchantServicesController = () => import('#controllers/merchant_services_controller')
const ConversationsController = () => import('#controllers/conversations_controller')
const ProfileController = () => import('#controllers/profile_controller')
const FavoritesController = () => import('#controllers/favorites_controller')
const AdminController = () => import('#controllers/admin_controller')
const SupportController = () => import('#controllers/support_controller')

router.get('/', () => ({ name: 'Dapita API', status: 'ok' }))

router
  .group(() => {
    // Auth (session cookie)
    router
      .group(() => {
        router.get('session', [AuthController, 'session'])
        router.post('sign-in', [AuthController, 'signIn'])
        router.post('sign-out', [AuthController, 'signOut'])
        router.post('sign-up', [AuthController, 'signUp'])
        router.post('verify', [AuthController, 'verifyEmail'])
        router.post('forgot-password', [AuthController, 'forgotPassword'])
      })
      .prefix('auth')

    // Public discovery
    router.get('categories', [CatalogController, 'categories'])
    router.get('areas', [CatalogController, 'areas'])
    router.get('shops', [ShopsController, 'index'])
    router.get('shops/featured', [ShopsController, 'featured'])
    router.get('shops/:slug', [ShopsController, 'show'])
    router.get('shops/:slug/services', [ShopsController, 'services'])
    router.get('shops/:slug/staff', [ShopsController, 'staff'])

    // Signed in
    router
      .group(() => {
        router.post('bookings', [BookingsController, 'store'])
        router.get('me/bookings', [BookingsController, 'index'])
        router.get('bookings/:id', [BookingsController, 'show'])
        router.post('bookings/:id/cancel', [BookingsController, 'cancel'])
        router.post('bookings/:id/accept-alternative', [BookingsController, 'acceptAlternative'])
        router.post('bookings/:id/decline-alternative', [BookingsController, 'declineAlternative'])

        router.get('me/profile', [ProfileController, 'show'])
        router.put('me/profile', [ProfileController, 'update'])
        router.get('me/consents', [ProfileController, 'consents'])
        router.post('me/deletion-request', [ProfileController, 'requestDeletion'])

        router.get('me/favorites', [FavoritesController, 'index'])
        router.put('me/favorites/:businessId', [FavoritesController, 'store'])
        router.delete('me/favorites/:businessId', [FavoritesController, 'destroy'])

        router.get('conversations', [ConversationsController, 'index'])
        router.post('conversations', [ConversationsController, 'store'])
        router.get('conversations/:id', [ConversationsController, 'show'])
        router.post('conversations/:id/messages', [ConversationsController, 'sendMessage'])
        router.post('conversations/:id/read', [ConversationsController, 'markRead'])
        router.post('conversations/:id/report', [ConversationsController, 'report'])

        router.post('support/requests', [SupportController, 'store'])

        router
          .group(() => {
            router.get('businesses/:businessId', [MerchantBusinessesController, 'show'])
            router.put('businesses/:businessId', [MerchantBusinessesController, 'update'])
            router.put('businesses/:businessId/hours', [
              MerchantBusinessesController,
              'updateHours',
            ])
            router.post('businesses/:businessId/closures', [
              MerchantBusinessesController,
              'addClosure',
            ])
            router.delete('businesses/:businessId/closures/:closureId', [
              MerchantBusinessesController,
              'deleteClosure',
            ])
            router.put('businesses/:businessId/policies', [
              MerchantBusinessesController,
              'updatePolicies',
            ])
            router.post('businesses/:businessId/submit', [MerchantBusinessesController, 'submit'])
            router.get('businesses/:businessId/notification-settings', [
              MerchantBusinessesController,
              'notificationSettings',
            ])
            router.put('businesses/:businessId/notification-settings', [
              MerchantBusinessesController,
              'updateNotificationSettings',
            ])

            router.get('businesses/:businessId/services', [MerchantServicesController, 'index'])
            router.post('businesses/:businessId/services', [MerchantServicesController, 'store'])
            router.put('businesses/:businessId/services/:serviceId', [
              MerchantServicesController,
              'update',
            ])
            router.post('businesses/:businessId/services/:serviceId/move', [
              MerchantServicesController,
              'move',
            ])
            router.delete('businesses/:businessId/services/:serviceId', [
              MerchantServicesController,
              'destroy',
            ])

            router.get('businesses/:businessId/bookings', [MerchantBookingsController, 'index'])
            router.get('businesses/:businessId/conversations', [
              ConversationsController,
              'businessIndex',
            ])
            router.get('bookings/:id', [MerchantBookingsController, 'show'])
            router.post('bookings/:id/accept', [MerchantBookingsController, 'accept'])
            router.post('bookings/:id/decline', [MerchantBookingsController, 'decline'])
            router.post('bookings/:id/propose', [MerchantBookingsController, 'propose'])
            router.post('bookings/:id/complete', [MerchantBookingsController, 'complete'])
            router.post('bookings/:id/no-show', [MerchantBookingsController, 'noShow'])
          })
          .prefix('merchant')

        // Admin console; each action checks the staff role it needs.
        router
          .group(() => {
            router.get('merchants', [AdminController, 'merchants'])
            router.get('merchants/:id', [AdminController, 'merchant'])
            router.post('merchants/:id/moderation', [AdminController, 'moderate'])
            router.put('merchants/:id/featured', [AdminController, 'featured'])

            router.get('cases', [AdminController, 'cases'])
            router.get('cases/:id', [AdminController, 'case'])
            router.post('cases/:id/take', [AdminController, 'takeCase'])
            router.post('cases/:id/notes', [AdminController, 'addNote'])
            router.post('cases/:id/resolve', [AdminController, 'resolve'])

            router.get('categories', [AdminController, 'categories'])
            router.post('categories', [AdminController, 'addCategory'])
            router.put('categories/:id', [AdminController, 'updateCategory'])
            router.post('categories/:id/move', [AdminController, 'moveCategory'])

            router.get('users', [AdminController, 'users'])
            router.post('users/:id/suspend', [AdminController, 'suspend'])
            router.post('users/:id/reinstate', [AdminController, 'reinstate'])
          })
          .prefix('admin')
      })
      .use(middleware.auth())
  })
  .prefix('/api')

/**
 * Realtime (Server-Sent Events) under /api/__transmit, so the same proxy covers it.
 * Subscribing needs a session; start/transmit.ts decides who may join which channel.
 */
transmit.registerRoutes((route) => {
  route.prefix('/api')
  if (route.getPattern().endsWith('__transmit/subscribe')) {
    route.middleware(middleware.auth())
  }
})

/**
 * Anything else under /api answers clearly instead of with a bare 404, so a screen
 * that calls an endpoint the server doesn't have yet shows a useful error.
 * Registered last: a wildcard registered earlier would shadow the routes after it.
 */
router.any('/api/*', () => {
  throw new ApiError(
    'This part of Dapita isn’t available on the server yet.',
    501,
    'not_implemented'
  )
})
