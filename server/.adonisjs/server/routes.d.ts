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
    'merchant_bookings.accept': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'merchant_bookings.decline': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'merchant_bookings.propose': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'merchant_bookings.complete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'merchant_bookings.no_show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'subscribe': { paramsTuple?: []; params?: {} }
    'unsubscribe': { paramsTuple?: []; params?: {} }
  }
  OPTIONS: {
  }
  PUT: {
  }
  PATCH: {
  }
  DELETE: {
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}