import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'auth.session': { paramsTuple?: []; params?: {} }
    'auth.sign_in': { paramsTuple?: []; params?: {} }
    'auth.sign_out': { paramsTuple?: []; params?: {} }
    'auth.sign_up': { paramsTuple?: []; params?: {} }
    'auth.verify_email': { paramsTuple?: []; params?: {} }
    'auth.forgot_password': { paramsTuple?: []; params?: {} }
    'catalog.categories': { paramsTuple?: []; params?: {} }
    'catalog.areas': { paramsTuple?: []; params?: {} }
    'shops.index': { paramsTuple?: []; params?: {} }
    'shops.featured': { paramsTuple?: []; params?: {} }
    'recommendations.index': { paramsTuple?: []; params?: {} }
    'shops.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shops.services': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shops.staff': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'bookings.store': { paramsTuple?: []; params?: {} }
    'bookings.index': { paramsTuple?: []; params?: {} }
    'bookings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bookings.cancel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bookings.accept_alternative': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bookings.decline_alternative': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'profile.update': { paramsTuple?: []; params?: {} }
    'profile.consents': { paramsTuple?: []; params?: {} }
    'profile.request_deletion': { paramsTuple?: []; params?: {} }
    'favorites.index': { paramsTuple?: []; params?: {} }
    'favorites.store': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'favorites.destroy': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'conversations.index': { paramsTuple?: []; params?: {} }
    'conversations.store': { paramsTuple?: []; params?: {} }
    'conversations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'conversations.send_message': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'conversations.mark_read': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'conversations.report': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'support.store': { paramsTuple?: []; params?: {} }
    'merchant_businesses.show': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_businesses.update': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_businesses.update_hours': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_businesses.add_closure': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_businesses.delete_closure': { paramsTuple: [ParamValue,ParamValue]; params: {'businessId': ParamValue,'closureId': ParamValue} }
    'merchant_businesses.update_policies': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_businesses.submit': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_businesses.notification_settings': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_businesses.update_notification_settings': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_services.index': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_services.store': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_services.update': { paramsTuple: [ParamValue,ParamValue]; params: {'businessId': ParamValue,'serviceId': ParamValue} }
    'merchant_services.move': { paramsTuple: [ParamValue,ParamValue]; params: {'businessId': ParamValue,'serviceId': ParamValue} }
    'merchant_services.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'businessId': ParamValue,'serviceId': ParamValue} }
    'merchant_bookings.index': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'conversations.business_index': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_bookings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'merchant_bookings.accept': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'merchant_bookings.decline': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'merchant_bookings.propose': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'merchant_bookings.complete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'merchant_bookings.no_show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.merchants': { paramsTuple?: []; params?: {} }
    'admin.merchant': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.moderate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.featured': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.cases': { paramsTuple?: []; params?: {} }
    'admin.case': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.take_case': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.add_note': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.resolve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.categories': { paramsTuple?: []; params?: {} }
    'admin.add_category': { paramsTuple?: []; params?: {} }
    'admin.update_category': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.move_category': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.users': { paramsTuple?: []; params?: {} }
    'admin.suspend': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.reinstate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'event_stream': { paramsTuple?: []; params?: {} }
    'subscribe': { paramsTuple?: []; params?: {} }
    'unsubscribe': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'auth.session': { paramsTuple?: []; params?: {} }
    'catalog.categories': { paramsTuple?: []; params?: {} }
    'catalog.areas': { paramsTuple?: []; params?: {} }
    'shops.index': { paramsTuple?: []; params?: {} }
    'shops.featured': { paramsTuple?: []; params?: {} }
    'recommendations.index': { paramsTuple?: []; params?: {} }
    'shops.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shops.services': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shops.staff': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'bookings.index': { paramsTuple?: []; params?: {} }
    'bookings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'profile.consents': { paramsTuple?: []; params?: {} }
    'favorites.index': { paramsTuple?: []; params?: {} }
    'conversations.index': { paramsTuple?: []; params?: {} }
    'conversations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'merchant_businesses.show': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_businesses.notification_settings': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_services.index': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_bookings.index': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'conversations.business_index': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_bookings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.merchants': { paramsTuple?: []; params?: {} }
    'admin.merchant': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.cases': { paramsTuple?: []; params?: {} }
    'admin.case': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.categories': { paramsTuple?: []; params?: {} }
    'admin.users': { paramsTuple?: []; params?: {} }
    'event_stream': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'auth.session': { paramsTuple?: []; params?: {} }
    'catalog.categories': { paramsTuple?: []; params?: {} }
    'catalog.areas': { paramsTuple?: []; params?: {} }
    'shops.index': { paramsTuple?: []; params?: {} }
    'shops.featured': { paramsTuple?: []; params?: {} }
    'recommendations.index': { paramsTuple?: []; params?: {} }
    'shops.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shops.services': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shops.staff': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'bookings.index': { paramsTuple?: []; params?: {} }
    'bookings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'profile.consents': { paramsTuple?: []; params?: {} }
    'favorites.index': { paramsTuple?: []; params?: {} }
    'conversations.index': { paramsTuple?: []; params?: {} }
    'conversations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'merchant_businesses.show': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_businesses.notification_settings': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_services.index': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_bookings.index': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'conversations.business_index': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_bookings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.merchants': { paramsTuple?: []; params?: {} }
    'admin.merchant': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.cases': { paramsTuple?: []; params?: {} }
    'admin.case': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.categories': { paramsTuple?: []; params?: {} }
    'admin.users': { paramsTuple?: []; params?: {} }
    'event_stream': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'auth.sign_in': { paramsTuple?: []; params?: {} }
    'auth.sign_out': { paramsTuple?: []; params?: {} }
    'auth.sign_up': { paramsTuple?: []; params?: {} }
    'auth.verify_email': { paramsTuple?: []; params?: {} }
    'auth.forgot_password': { paramsTuple?: []; params?: {} }
    'bookings.store': { paramsTuple?: []; params?: {} }
    'bookings.cancel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bookings.accept_alternative': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bookings.decline_alternative': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.request_deletion': { paramsTuple?: []; params?: {} }
    'conversations.store': { paramsTuple?: []; params?: {} }
    'conversations.send_message': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'conversations.mark_read': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'conversations.report': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'support.store': { paramsTuple?: []; params?: {} }
    'merchant_businesses.add_closure': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_businesses.submit': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_services.store': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_services.move': { paramsTuple: [ParamValue,ParamValue]; params: {'businessId': ParamValue,'serviceId': ParamValue} }
    'merchant_bookings.accept': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'merchant_bookings.decline': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'merchant_bookings.propose': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'merchant_bookings.complete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'merchant_bookings.no_show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.moderate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.take_case': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.add_note': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.resolve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.add_category': { paramsTuple?: []; params?: {} }
    'admin.move_category': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.suspend': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.reinstate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'subscribe': { paramsTuple?: []; params?: {} }
    'unsubscribe': { paramsTuple?: []; params?: {} }
  }
  PUT: {
    'profile.update': { paramsTuple?: []; params?: {} }
    'favorites.store': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_businesses.update': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_businesses.update_hours': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_businesses.update_policies': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_businesses.update_notification_settings': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_services.update': { paramsTuple: [ParamValue,ParamValue]; params: {'businessId': ParamValue,'serviceId': ParamValue} }
    'admin.featured': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.update_category': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'favorites.destroy': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_businesses.delete_closure': { paramsTuple: [ParamValue,ParamValue]; params: {'businessId': ParamValue,'closureId': ParamValue} }
    'merchant_services.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'businessId': ParamValue,'serviceId': ParamValue} }
  }
  OPTIONS: {
  }
  PATCH: {
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}