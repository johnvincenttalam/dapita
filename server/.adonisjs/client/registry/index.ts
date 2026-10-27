/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'auth.session': {
    methods: ["GET","HEAD"],
    pattern: '/api/auth/session',
    tokens: [[0,"api"],[0,"auth"],[0,"session"]],
    types: placeholder as Registry['auth.session']['types'],
  },
  'auth.sign_in': {
    methods: ["POST"],
    pattern: '/api/auth/sign-in',
    tokens: [[0,"api"],[0,"auth"],[0,"sign-in"]],
    types: placeholder as Registry['auth.sign_in']['types'],
  },
  'auth.sign_out': {
    methods: ["POST"],
    pattern: '/api/auth/sign-out',
    tokens: [[0,"api"],[0,"auth"],[0,"sign-out"]],
    types: placeholder as Registry['auth.sign_out']['types'],
  },
  'auth.sign_up': {
    methods: ["POST"],
    pattern: '/api/auth/sign-up',
    tokens: [[0,"api"],[0,"auth"],[0,"sign-up"]],
    types: placeholder as Registry['auth.sign_up']['types'],
  },
  'auth.verify_email': {
    methods: ["POST"],
    pattern: '/api/auth/verify',
    tokens: [[0,"api"],[0,"auth"],[0,"verify"]],
    types: placeholder as Registry['auth.verify_email']['types'],
  },
  'auth.forgot_password': {
    methods: ["POST"],
    pattern: '/api/auth/forgot-password',
    tokens: [[0,"api"],[0,"auth"],[0,"forgot-password"]],
    types: placeholder as Registry['auth.forgot_password']['types'],
  },
  'catalog.categories': {
    methods: ["GET","HEAD"],
    pattern: '/api/categories',
    tokens: [[0,"api"],[0,"categories"]],
    types: placeholder as Registry['catalog.categories']['types'],
  },
  'catalog.areas': {
    methods: ["GET","HEAD"],
    pattern: '/api/areas',
    tokens: [[0,"api"],[0,"areas"]],
    types: placeholder as Registry['catalog.areas']['types'],
  },
  'shops.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/shops',
    tokens: [[0,"api"],[0,"shops"]],
    types: placeholder as Registry['shops.index']['types'],
  },
  'shops.featured': {
    methods: ["GET","HEAD"],
    pattern: '/api/shops/featured',
    tokens: [[0,"api"],[0,"shops"],[0,"featured"]],
    types: placeholder as Registry['shops.featured']['types'],
  },
  'shops.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/shops/:slug',
    tokens: [[0,"api"],[0,"shops"],[1,"slug"]],
    types: placeholder as Registry['shops.show']['types'],
  },
  'shops.services': {
    methods: ["GET","HEAD"],
    pattern: '/api/shops/:slug/services',
    tokens: [[0,"api"],[0,"shops"],[1,"slug"],[0,"services"]],
    types: placeholder as Registry['shops.services']['types'],
  },
  'shops.staff': {
    methods: ["GET","HEAD"],
    pattern: '/api/shops/:slug/staff',
    tokens: [[0,"api"],[0,"shops"],[1,"slug"],[0,"staff"]],
    types: placeholder as Registry['shops.staff']['types'],
  },
  'bookings.store': {
    methods: ["POST"],
    pattern: '/api/bookings',
    tokens: [[0,"api"],[0,"bookings"]],
    types: placeholder as Registry['bookings.store']['types'],
  },
  'bookings.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/me/bookings',
    tokens: [[0,"api"],[0,"me"],[0,"bookings"]],
    types: placeholder as Registry['bookings.index']['types'],
  },
  'bookings.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/bookings/:id',
    tokens: [[0,"api"],[0,"bookings"],[1,"id"]],
    types: placeholder as Registry['bookings.show']['types'],
  },
  'bookings.cancel': {
    methods: ["POST"],
    pattern: '/api/bookings/:id/cancel',
    tokens: [[0,"api"],[0,"bookings"],[1,"id"],[0,"cancel"]],
    types: placeholder as Registry['bookings.cancel']['types'],
  },
  'bookings.accept_alternative': {
    methods: ["POST"],
    pattern: '/api/bookings/:id/accept-alternative',
    tokens: [[0,"api"],[0,"bookings"],[1,"id"],[0,"accept-alternative"]],
    types: placeholder as Registry['bookings.accept_alternative']['types'],
  },
  'bookings.decline_alternative': {
    methods: ["POST"],
    pattern: '/api/bookings/:id/decline-alternative',
    tokens: [[0,"api"],[0,"bookings"],[1,"id"],[0,"decline-alternative"]],
    types: placeholder as Registry['bookings.decline_alternative']['types'],
  },
  'conversations.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/conversations',
    tokens: [[0,"api"],[0,"conversations"]],
    types: placeholder as Registry['conversations.index']['types'],
  },
  'conversations.store': {
    methods: ["POST"],
    pattern: '/api/conversations',
    tokens: [[0,"api"],[0,"conversations"]],
    types: placeholder as Registry['conversations.store']['types'],
  },
  'conversations.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/conversations/:id',
    tokens: [[0,"api"],[0,"conversations"],[1,"id"]],
    types: placeholder as Registry['conversations.show']['types'],
  },
  'conversations.send_message': {
    methods: ["POST"],
    pattern: '/api/conversations/:id/messages',
    tokens: [[0,"api"],[0,"conversations"],[1,"id"],[0,"messages"]],
    types: placeholder as Registry['conversations.send_message']['types'],
  },
  'conversations.mark_read': {
    methods: ["POST"],
    pattern: '/api/conversations/:id/read',
    tokens: [[0,"api"],[0,"conversations"],[1,"id"],[0,"read"]],
    types: placeholder as Registry['conversations.mark_read']['types'],
  },
  'conversations.report': {
    methods: ["POST"],
    pattern: '/api/conversations/:id/report',
    tokens: [[0,"api"],[0,"conversations"],[1,"id"],[0,"report"]],
    types: placeholder as Registry['conversations.report']['types'],
  },
  'merchant_businesses.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/merchant/businesses/:businessId',
    tokens: [[0,"api"],[0,"merchant"],[0,"businesses"],[1,"businessId"]],
    types: placeholder as Registry['merchant_businesses.show']['types'],
  },
  'merchant_businesses.update': {
    methods: ["PUT"],
    pattern: '/api/merchant/businesses/:businessId',
    tokens: [[0,"api"],[0,"merchant"],[0,"businesses"],[1,"businessId"]],
    types: placeholder as Registry['merchant_businesses.update']['types'],
  },
  'merchant_businesses.update_hours': {
    methods: ["PUT"],
    pattern: '/api/merchant/businesses/:businessId/hours',
    tokens: [[0,"api"],[0,"merchant"],[0,"businesses"],[1,"businessId"],[0,"hours"]],
    types: placeholder as Registry['merchant_businesses.update_hours']['types'],
  },
  'merchant_businesses.add_closure': {
    methods: ["POST"],
    pattern: '/api/merchant/businesses/:businessId/closures',
    tokens: [[0,"api"],[0,"merchant"],[0,"businesses"],[1,"businessId"],[0,"closures"]],
    types: placeholder as Registry['merchant_businesses.add_closure']['types'],
  },
  'merchant_businesses.delete_closure': {
    methods: ["DELETE"],
    pattern: '/api/merchant/businesses/:businessId/closures/:closureId',
    tokens: [[0,"api"],[0,"merchant"],[0,"businesses"],[1,"businessId"],[0,"closures"],[1,"closureId"]],
    types: placeholder as Registry['merchant_businesses.delete_closure']['types'],
  },
  'merchant_businesses.update_policies': {
    methods: ["PUT"],
    pattern: '/api/merchant/businesses/:businessId/policies',
    tokens: [[0,"api"],[0,"merchant"],[0,"businesses"],[1,"businessId"],[0,"policies"]],
    types: placeholder as Registry['merchant_businesses.update_policies']['types'],
  },
  'merchant_businesses.submit': {
    methods: ["POST"],
    pattern: '/api/merchant/businesses/:businessId/submit',
    tokens: [[0,"api"],[0,"merchant"],[0,"businesses"],[1,"businessId"],[0,"submit"]],
    types: placeholder as Registry['merchant_businesses.submit']['types'],
  },
  'merchant_businesses.notification_settings': {
    methods: ["GET","HEAD"],
    pattern: '/api/merchant/businesses/:businessId/notification-settings',
    tokens: [[0,"api"],[0,"merchant"],[0,"businesses"],[1,"businessId"],[0,"notification-settings"]],
    types: placeholder as Registry['merchant_businesses.notification_settings']['types'],
  },
  'merchant_businesses.update_notification_settings': {
    methods: ["PUT"],
    pattern: '/api/merchant/businesses/:businessId/notification-settings',
    tokens: [[0,"api"],[0,"merchant"],[0,"businesses"],[1,"businessId"],[0,"notification-settings"]],
    types: placeholder as Registry['merchant_businesses.update_notification_settings']['types'],
  },
  'merchant_services.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/merchant/businesses/:businessId/services',
    tokens: [[0,"api"],[0,"merchant"],[0,"businesses"],[1,"businessId"],[0,"services"]],
    types: placeholder as Registry['merchant_services.index']['types'],
  },
  'merchant_services.store': {
    methods: ["POST"],
    pattern: '/api/merchant/businesses/:businessId/services',
    tokens: [[0,"api"],[0,"merchant"],[0,"businesses"],[1,"businessId"],[0,"services"]],
    types: placeholder as Registry['merchant_services.store']['types'],
  },
  'merchant_services.update': {
    methods: ["PUT"],
    pattern: '/api/merchant/businesses/:businessId/services/:serviceId',
    tokens: [[0,"api"],[0,"merchant"],[0,"businesses"],[1,"businessId"],[0,"services"],[1,"serviceId"]],
    types: placeholder as Registry['merchant_services.update']['types'],
  },
  'merchant_services.move': {
    methods: ["POST"],
    pattern: '/api/merchant/businesses/:businessId/services/:serviceId/move',
    tokens: [[0,"api"],[0,"merchant"],[0,"businesses"],[1,"businessId"],[0,"services"],[1,"serviceId"],[0,"move"]],
    types: placeholder as Registry['merchant_services.move']['types'],
  },
  'merchant_services.destroy': {
    methods: ["DELETE"],
    pattern: '/api/merchant/businesses/:businessId/services/:serviceId',
    tokens: [[0,"api"],[0,"merchant"],[0,"businesses"],[1,"businessId"],[0,"services"],[1,"serviceId"]],
    types: placeholder as Registry['merchant_services.destroy']['types'],
  },
  'merchant_bookings.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/merchant/businesses/:businessId/bookings',
    tokens: [[0,"api"],[0,"merchant"],[0,"businesses"],[1,"businessId"],[0,"bookings"]],
    types: placeholder as Registry['merchant_bookings.index']['types'],
  },
  'conversations.business_index': {
    methods: ["GET","HEAD"],
    pattern: '/api/merchant/businesses/:businessId/conversations',
    tokens: [[0,"api"],[0,"merchant"],[0,"businesses"],[1,"businessId"],[0,"conversations"]],
    types: placeholder as Registry['conversations.business_index']['types'],
  },
  'merchant_bookings.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/merchant/bookings/:id',
    tokens: [[0,"api"],[0,"merchant"],[0,"bookings"],[1,"id"]],
    types: placeholder as Registry['merchant_bookings.show']['types'],
  },
  'merchant_bookings.accept': {
    methods: ["POST"],
    pattern: '/api/merchant/bookings/:id/accept',
    tokens: [[0,"api"],[0,"merchant"],[0,"bookings"],[1,"id"],[0,"accept"]],
    types: placeholder as Registry['merchant_bookings.accept']['types'],
  },
  'merchant_bookings.decline': {
    methods: ["POST"],
    pattern: '/api/merchant/bookings/:id/decline',
    tokens: [[0,"api"],[0,"merchant"],[0,"bookings"],[1,"id"],[0,"decline"]],
    types: placeholder as Registry['merchant_bookings.decline']['types'],
  },
  'merchant_bookings.propose': {
    methods: ["POST"],
    pattern: '/api/merchant/bookings/:id/propose',
    tokens: [[0,"api"],[0,"merchant"],[0,"bookings"],[1,"id"],[0,"propose"]],
    types: placeholder as Registry['merchant_bookings.propose']['types'],
  },
  'merchant_bookings.complete': {
    methods: ["POST"],
    pattern: '/api/merchant/bookings/:id/complete',
    tokens: [[0,"api"],[0,"merchant"],[0,"bookings"],[1,"id"],[0,"complete"]],
    types: placeholder as Registry['merchant_bookings.complete']['types'],
  },
  'merchant_bookings.no_show': {
    methods: ["POST"],
    pattern: '/api/merchant/bookings/:id/no-show',
    tokens: [[0,"api"],[0,"merchant"],[0,"bookings"],[1,"id"],[0,"no-show"]],
    types: placeholder as Registry['merchant_bookings.no_show']['types'],
  },
  'event_stream': {
    methods: ["GET","HEAD"],
    pattern: '/api/__transmit/events',
    tokens: [[0,"api"],[0,"__transmit"],[0,"events"]],
    types: placeholder as Registry['event_stream']['types'],
  },
  'subscribe': {
    methods: ["POST"],
    pattern: '/api/__transmit/subscribe',
    tokens: [[0,"api"],[0,"__transmit"],[0,"subscribe"]],
    types: placeholder as Registry['subscribe']['types'],
  },
  'unsubscribe': {
    methods: ["POST"],
    pattern: '/api/__transmit/unsubscribe',
    tokens: [[0,"api"],[0,"__transmit"],[0,"unsubscribe"]],
    types: placeholder as Registry['unsubscribe']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
