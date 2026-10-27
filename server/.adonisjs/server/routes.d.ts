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
    'shops.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shops.services': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shops.staff': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'bookings.store': { paramsTuple?: []; params?: {} }
    'bookings.index': { paramsTuple?: []; params?: {} }
    'bookings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bookings.cancel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bookings.accept_alternative': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bookings.decline_alternative': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'conversations.index': { paramsTuple?: []; params?: {} }
    'conversations.store': { paramsTuple?: []; params?: {} }
    'conversations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'conversations.send_message': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'conversations.mark_read': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'conversations.report': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
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
    'shops.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shops.services': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shops.staff': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'bookings.index': { paramsTuple?: []; params?: {} }
    'bookings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'conversations.index': { paramsTuple?: []; params?: {} }
    'conversations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'merchant_businesses.show': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_businesses.notification_settings': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_services.index': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_bookings.index': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'conversations.business_index': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_bookings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'event_stream': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'auth.session': { paramsTuple?: []; params?: {} }
    'catalog.categories': { paramsTuple?: []; params?: {} }
    'catalog.areas': { paramsTuple?: []; params?: {} }
    'shops.index': { paramsTuple?: []; params?: {} }
    'shops.featured': { paramsTuple?: []; params?: {} }
    'shops.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shops.services': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shops.staff': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'bookings.index': { paramsTuple?: []; params?: {} }
    'bookings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'conversations.index': { paramsTuple?: []; params?: {} }
    'conversations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'merchant_businesses.show': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_businesses.notification_settings': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_services.index': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_bookings.index': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'conversations.business_index': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_bookings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
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
    'conversations.store': { paramsTuple?: []; params?: {} }
    'conversations.send_message': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'conversations.mark_read': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'conversations.report': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'merchant_businesses.add_closure': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_businesses.submit': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_services.store': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_services.move': { paramsTuple: [ParamValue,ParamValue]; params: {'businessId': ParamValue,'serviceId': ParamValue} }
    'merchant_bookings.accept': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'merchant_bookings.decline': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'merchant_bookings.propose': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'merchant_bookings.complete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'merchant_bookings.no_show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'subscribe': { paramsTuple?: []; params?: {} }
    'unsubscribe': { paramsTuple?: []; params?: {} }
  }
  PUT: {
    'merchant_businesses.update': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_businesses.update_hours': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_businesses.update_policies': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_businesses.update_notification_settings': { paramsTuple: [ParamValue]; params: {'businessId': ParamValue} }
    'merchant_services.update': { paramsTuple: [ParamValue,ParamValue]; params: {'businessId': ParamValue,'serviceId': ParamValue} }
  }
  DELETE: {
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