/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  auth: {
    session: typeof routes['auth.session']
    signIn: typeof routes['auth.sign_in']
    signOut: typeof routes['auth.sign_out']
    signUp: typeof routes['auth.sign_up']
    verifyEmail: typeof routes['auth.verify_email']
    forgotPassword: typeof routes['auth.forgot_password']
  }
  catalog: {
    categories: typeof routes['catalog.categories']
    areas: typeof routes['catalog.areas']
  }
  shops: {
    index: typeof routes['shops.index']
    featured: typeof routes['shops.featured']
    show: typeof routes['shops.show']
    services: typeof routes['shops.services']
    staff: typeof routes['shops.staff']
  }
  bookings: {
    store: typeof routes['bookings.store']
    index: typeof routes['bookings.index']
    show: typeof routes['bookings.show']
    cancel: typeof routes['bookings.cancel']
    acceptAlternative: typeof routes['bookings.accept_alternative']
    declineAlternative: typeof routes['bookings.decline_alternative']
  }
  conversations: {
    index: typeof routes['conversations.index']
    store: typeof routes['conversations.store']
    show: typeof routes['conversations.show']
    sendMessage: typeof routes['conversations.send_message']
    markRead: typeof routes['conversations.mark_read']
    report: typeof routes['conversations.report']
    businessIndex: typeof routes['conversations.business_index']
  }
  merchantBusinesses: {
    show: typeof routes['merchant_businesses.show']
  }
  merchantBookings: {
    index: typeof routes['merchant_bookings.index']
    show: typeof routes['merchant_bookings.show']
    accept: typeof routes['merchant_bookings.accept']
    decline: typeof routes['merchant_bookings.decline']
    propose: typeof routes['merchant_bookings.propose']
    complete: typeof routes['merchant_bookings.complete']
    noShow: typeof routes['merchant_bookings.no_show']
  }
  eventStream: typeof routes['event_stream']
  subscribe: typeof routes['subscribe']
  unsubscribe: typeof routes['unsubscribe']
}
