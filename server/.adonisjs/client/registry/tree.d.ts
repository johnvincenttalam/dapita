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
  profile: {
    show: typeof routes['profile.show']
    update: typeof routes['profile.update']
    consents: typeof routes['profile.consents']
    requestDeletion: typeof routes['profile.request_deletion']
  }
  favorites: {
    index: typeof routes['favorites.index']
    store: typeof routes['favorites.store']
    destroy: typeof routes['favorites.destroy']
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
  support: {
    store: typeof routes['support.store']
  }
  merchantBusinesses: {
    show: typeof routes['merchant_businesses.show']
    update: typeof routes['merchant_businesses.update']
    updateHours: typeof routes['merchant_businesses.update_hours']
    addClosure: typeof routes['merchant_businesses.add_closure']
    deleteClosure: typeof routes['merchant_businesses.delete_closure']
    updatePolicies: typeof routes['merchant_businesses.update_policies']
    submit: typeof routes['merchant_businesses.submit']
    notificationSettings: typeof routes['merchant_businesses.notification_settings']
    updateNotificationSettings: typeof routes['merchant_businesses.update_notification_settings']
  }
  merchantServices: {
    index: typeof routes['merchant_services.index']
    store: typeof routes['merchant_services.store']
    update: typeof routes['merchant_services.update']
    move: typeof routes['merchant_services.move']
    destroy: typeof routes['merchant_services.destroy']
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
  admin: {
    merchants: typeof routes['admin.merchants']
    merchant: typeof routes['admin.merchant']
    moderate: typeof routes['admin.moderate']
    featured: typeof routes['admin.featured']
    cases: typeof routes['admin.cases']
    case: typeof routes['admin.case']
    takeCase: typeof routes['admin.take_case']
    addNote: typeof routes['admin.add_note']
    resolve: typeof routes['admin.resolve']
    categories: typeof routes['admin.categories']
    addCategory: typeof routes['admin.add_category']
    updateCategory: typeof routes['admin.update_category']
    moveCategory: typeof routes['admin.move_category']
    users: typeof routes['admin.users']
    suspend: typeof routes['admin.suspend']
    reinstate: typeof routes['admin.reinstate']
  }
  eventStream: typeof routes['event_stream']
  subscribe: typeof routes['subscribe']
  unsubscribe: typeof routes['unsubscribe']
}
