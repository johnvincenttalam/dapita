/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractRawResponse, ExtractResponse } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'auth.session': {
    methods: ["GET","HEAD"]
    pattern: '/api/auth/session'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['session']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['session']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['session']>>>
    }
  }
  'auth.sign_in': {
    methods: ["POST"]
    pattern: '/api/auth/sign-in'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/auth').signInValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/auth').signInValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['signIn']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['signIn']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['signIn']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth.sign_out': {
    methods: ["POST"]
    pattern: '/api/auth/sign-out'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['signOut']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['signOut']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['signOut']>>>
    }
  }
  'auth.sign_up': {
    methods: ["POST"]
    pattern: '/api/auth/sign-up'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/auth').signUpValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/auth').signUpValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['signUp']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['signUp']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['signUp']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth.verify_email': {
    methods: ["POST"]
    pattern: '/api/auth/verify'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/auth').verifyEmailValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/auth').verifyEmailValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['verifyEmail']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['verifyEmail']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['verifyEmail']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth.forgot_password': {
    methods: ["POST"]
    pattern: '/api/auth/forgot-password'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/auth').forgotPasswordValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/auth').forgotPasswordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['forgotPassword']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['forgotPassword']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['forgotPassword']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'catalog.categories': {
    methods: ["GET","HEAD"]
    pattern: '/api/categories'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/catalog_controller').default['categories']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/catalog_controller').default['categories']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/catalog_controller').default['categories']>>>
    }
  }
  'catalog.areas': {
    methods: ["GET","HEAD"]
    pattern: '/api/areas'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/catalog_controller').default['areas']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/catalog_controller').default['areas']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/catalog_controller').default['areas']>>>
    }
  }
  'shops.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/shops'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/shops_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/shops_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/shops_controller').default['index']>>>
    }
  }
  'shops.featured': {
    methods: ["GET","HEAD"]
    pattern: '/api/shops/featured'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/shops_controller').default['featured']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/shops_controller').default['featured']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/shops_controller').default['featured']>>>
    }
  }
  'shops.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/shops/:slug'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { slug: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/shops_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/shops_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/shops_controller').default['show']>>>
    }
  }
  'shops.services': {
    methods: ["GET","HEAD"]
    pattern: '/api/shops/:slug/services'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { slug: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/shops_controller').default['services']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/shops_controller').default['services']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/shops_controller').default['services']>>>
    }
  }
  'shops.staff': {
    methods: ["GET","HEAD"]
    pattern: '/api/shops/:slug/staff'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { slug: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/shops_controller').default['staff']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/shops_controller').default['staff']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/shops_controller').default['staff']>>>
    }
  }
  'bookings.store': {
    methods: ["POST"]
    pattern: '/api/bookings'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/booking').createBookingValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/booking').createBookingValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/bookings_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/bookings_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/bookings_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'bookings.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/me/bookings'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/bookings_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/bookings_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/bookings_controller').default['index']>>>
    }
  }
  'bookings.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/bookings/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/bookings_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/bookings_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/bookings_controller').default['show']>>>
    }
  }
  'bookings.cancel': {
    methods: ["POST"]
    pattern: '/api/bookings/:id/cancel'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/booking').reasonValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/booking').reasonValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/bookings_controller').default['cancel']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/bookings_controller').default['cancel']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/bookings_controller').default['cancel']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'bookings.accept_alternative': {
    methods: ["POST"]
    pattern: '/api/bookings/:id/accept-alternative'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/bookings_controller').default['acceptAlternative']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/bookings_controller').default['acceptAlternative']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/bookings_controller').default['acceptAlternative']>>>
    }
  }
  'bookings.decline_alternative': {
    methods: ["POST"]
    pattern: '/api/bookings/:id/decline-alternative'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/booking').reasonValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/booking').reasonValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/bookings_controller').default['declineAlternative']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/bookings_controller').default['declineAlternative']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/bookings_controller').default['declineAlternative']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'profile.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/me/profile'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
    }
  }
  'profile.update': {
    methods: ["PUT"]
    pattern: '/api/me/profile'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['update']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['update']>>>
    }
  }
  'profile.consents': {
    methods: ["GET","HEAD"]
    pattern: '/api/me/consents'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['consents']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['consents']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['consents']>>>
    }
  }
  'profile.request_deletion': {
    methods: ["POST"]
    pattern: '/api/me/deletion-request'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['requestDeletion']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['requestDeletion']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['requestDeletion']>>>
    }
  }
  'favorites.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/me/favorites'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/favorites_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/favorites_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/favorites_controller').default['index']>>>
    }
  }
  'favorites.store': {
    methods: ["PUT"]
    pattern: '/api/me/favorites/:businessId'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { businessId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/favorites_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/favorites_controller').default['store']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/favorites_controller').default['store']>>>
    }
  }
  'favorites.destroy': {
    methods: ["DELETE"]
    pattern: '/api/me/favorites/:businessId'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { businessId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/favorites_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/favorites_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/favorites_controller').default['destroy']>>>
    }
  }
  'conversations.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/conversations'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/conversations_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/conversations_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/conversations_controller').default['index']>>>
    }
  }
  'conversations.store': {
    methods: ["POST"]
    pattern: '/api/conversations'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/conversation').startConversationValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/conversation').startConversationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/conversations_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/conversations_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/conversations_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'conversations.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/conversations/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/conversations_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/conversations_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/conversations_controller').default['show']>>>
    }
  }
  'conversations.send_message': {
    methods: ["POST"]
    pattern: '/api/conversations/:id/messages'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/conversation').messageValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/conversation').messageValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/conversations_controller').default['sendMessage']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/conversations_controller').default['sendMessage']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/conversations_controller').default['sendMessage']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'conversations.mark_read': {
    methods: ["POST"]
    pattern: '/api/conversations/:id/read'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/conversations_controller').default['markRead']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/conversations_controller').default['markRead']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/conversations_controller').default['markRead']>>>
    }
  }
  'conversations.report': {
    methods: ["POST"]
    pattern: '/api/conversations/:id/report'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/conversation').reportValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/conversation').reportValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/conversations_controller').default['report']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/conversations_controller').default['report']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/conversations_controller').default['report']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'support.store': {
    methods: ["POST"]
    pattern: '/api/support/requests'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/support_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/support_controller').default['store']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/support_controller').default['store']>>>
    }
  }
  'merchant_businesses.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/merchant/businesses/:businessId'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { businessId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/merchant_businesses_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/merchant_businesses_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/merchant_businesses_controller').default['show']>>>
    }
  }
  'merchant_businesses.update': {
    methods: ["PUT"]
    pattern: '/api/merchant/businesses/:businessId'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { businessId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/merchant_businesses_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/merchant_businesses_controller').default['update']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/merchant_businesses_controller').default['update']>>>
    }
  }
  'merchant_businesses.update_hours': {
    methods: ["PUT"]
    pattern: '/api/merchant/businesses/:businessId/hours'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { businessId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/merchant_businesses_controller').default['updateHours']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/merchant_businesses_controller').default['updateHours']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/merchant_businesses_controller').default['updateHours']>>>
    }
  }
  'merchant_businesses.add_closure': {
    methods: ["POST"]
    pattern: '/api/merchant/businesses/:businessId/closures'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { businessId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/merchant_businesses_controller').default['addClosure']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/merchant_businesses_controller').default['addClosure']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/merchant_businesses_controller').default['addClosure']>>>
    }
  }
  'merchant_businesses.delete_closure': {
    methods: ["DELETE"]
    pattern: '/api/merchant/businesses/:businessId/closures/:closureId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { businessId: ParamValue; closureId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/merchant_businesses_controller').default['deleteClosure']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/merchant_businesses_controller').default['deleteClosure']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/merchant_businesses_controller').default['deleteClosure']>>>
    }
  }
  'merchant_businesses.update_policies': {
    methods: ["PUT"]
    pattern: '/api/merchant/businesses/:businessId/policies'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { businessId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/merchant_businesses_controller').default['updatePolicies']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/merchant_businesses_controller').default['updatePolicies']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/merchant_businesses_controller').default['updatePolicies']>>>
    }
  }
  'merchant_businesses.submit': {
    methods: ["POST"]
    pattern: '/api/merchant/businesses/:businessId/submit'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { businessId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/merchant_businesses_controller').default['submit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/merchant_businesses_controller').default['submit']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/merchant_businesses_controller').default['submit']>>>
    }
  }
  'merchant_businesses.notification_settings': {
    methods: ["GET","HEAD"]
    pattern: '/api/merchant/businesses/:businessId/notification-settings'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { businessId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/merchant_businesses_controller').default['notificationSettings']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/merchant_businesses_controller').default['notificationSettings']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/merchant_businesses_controller').default['notificationSettings']>>>
    }
  }
  'merchant_businesses.update_notification_settings': {
    methods: ["PUT"]
    pattern: '/api/merchant/businesses/:businessId/notification-settings'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/merchant').notificationSettingsValidator)>>
      paramsTuple: [ParamValue]
      params: { businessId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/merchant').notificationSettingsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/merchant_businesses_controller').default['updateNotificationSettings']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/merchant_businesses_controller').default['updateNotificationSettings']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/merchant_businesses_controller').default['updateNotificationSettings']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'merchant_services.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/merchant/businesses/:businessId/services'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { businessId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/merchant_services_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/merchant_services_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/merchant_services_controller').default['index']>>>
    }
  }
  'merchant_services.store': {
    methods: ["POST"]
    pattern: '/api/merchant/businesses/:businessId/services'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { businessId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/merchant_services_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/merchant_services_controller').default['store']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/merchant_services_controller').default['store']>>>
    }
  }
  'merchant_services.update': {
    methods: ["PUT"]
    pattern: '/api/merchant/businesses/:businessId/services/:serviceId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { businessId: ParamValue; serviceId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/merchant_services_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/merchant_services_controller').default['update']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/merchant_services_controller').default['update']>>>
    }
  }
  'merchant_services.move': {
    methods: ["POST"]
    pattern: '/api/merchant/businesses/:businessId/services/:serviceId/move'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/merchant').moveServiceValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { businessId: ParamValue; serviceId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/merchant').moveServiceValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/merchant_services_controller').default['move']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/merchant_services_controller').default['move']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/merchant_services_controller').default['move']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'merchant_services.destroy': {
    methods: ["DELETE"]
    pattern: '/api/merchant/businesses/:businessId/services/:serviceId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { businessId: ParamValue; serviceId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/merchant_services_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/merchant_services_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/merchant_services_controller').default['destroy']>>>
    }
  }
  'merchant_bookings.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/merchant/businesses/:businessId/bookings'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { businessId: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/booking').businessBookingsQueryValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/merchant_bookings_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/merchant_bookings_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/merchant_bookings_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'conversations.business_index': {
    methods: ["GET","HEAD"]
    pattern: '/api/merchant/businesses/:businessId/conversations'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { businessId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/conversations_controller').default['businessIndex']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/conversations_controller').default['businessIndex']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/conversations_controller').default['businessIndex']>>>
    }
  }
  'merchant_bookings.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/merchant/bookings/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/merchant_bookings_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/merchant_bookings_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/merchant_bookings_controller').default['show']>>>
    }
  }
  'merchant_bookings.accept': {
    methods: ["POST"]
    pattern: '/api/merchant/bookings/:id/accept'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/merchant_bookings_controller').default['accept']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/merchant_bookings_controller').default['accept']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/merchant_bookings_controller').default['accept']>>>
    }
  }
  'merchant_bookings.decline': {
    methods: ["POST"]
    pattern: '/api/merchant/bookings/:id/decline'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/booking').reasonValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/booking').reasonValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/merchant_bookings_controller').default['decline']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/merchant_bookings_controller').default['decline']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/merchant_bookings_controller').default['decline']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'merchant_bookings.propose': {
    methods: ["POST"]
    pattern: '/api/merchant/bookings/:id/propose'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/booking').proposeValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/booking').proposeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/merchant_bookings_controller').default['propose']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/merchant_bookings_controller').default['propose']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/merchant_bookings_controller').default['propose']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'merchant_bookings.complete': {
    methods: ["POST"]
    pattern: '/api/merchant/bookings/:id/complete'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/merchant_bookings_controller').default['complete']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/merchant_bookings_controller').default['complete']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/merchant_bookings_controller').default['complete']>>>
    }
  }
  'merchant_bookings.no_show': {
    methods: ["POST"]
    pattern: '/api/merchant/bookings/:id/no-show'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/merchant_bookings_controller').default['noShow']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/merchant_bookings_controller').default['noShow']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/merchant_bookings_controller').default['noShow']>>>
    }
  }
  'admin.merchants': {
    methods: ["GET","HEAD"]
    pattern: '/api/admin/merchants'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['merchants']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['merchants']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['merchants']>>>
    }
  }
  'admin.merchant': {
    methods: ["GET","HEAD"]
    pattern: '/api/admin/merchants/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['merchant']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['merchant']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['merchant']>>>
    }
  }
  'admin.moderate': {
    methods: ["POST"]
    pattern: '/api/admin/merchants/:id/moderation'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['moderate']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['moderate']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['moderate']>>>
    }
  }
  'admin.featured': {
    methods: ["PUT"]
    pattern: '/api/admin/merchants/:id/featured'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/admin').featuredValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/admin').featuredValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['featured']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['featured']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['featured']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.cases': {
    methods: ["GET","HEAD"]
    pattern: '/api/admin/cases'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['cases']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['cases']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['cases']>>>
    }
  }
  'admin.case': {
    methods: ["GET","HEAD"]
    pattern: '/api/admin/cases/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['case']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['case']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['case']>>>
    }
  }
  'admin.take_case': {
    methods: ["POST"]
    pattern: '/api/admin/cases/:id/take'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['takeCase']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['takeCase']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['takeCase']>>>
    }
  }
  'admin.add_note': {
    methods: ["POST"]
    pattern: '/api/admin/cases/:id/notes'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['addNote']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['addNote']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['addNote']>>>
    }
  }
  'admin.resolve': {
    methods: ["POST"]
    pattern: '/api/admin/cases/:id/resolve'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['resolve']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['resolve']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['resolve']>>>
    }
  }
  'admin.categories': {
    methods: ["GET","HEAD"]
    pattern: '/api/admin/categories'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['categories']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['categories']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['categories']>>>
    }
  }
  'admin.add_category': {
    methods: ["POST"]
    pattern: '/api/admin/categories'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['addCategory']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['addCategory']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['addCategory']>>>
    }
  }
  'admin.update_category': {
    methods: ["PUT"]
    pattern: '/api/admin/categories/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['updateCategory']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['updateCategory']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['updateCategory']>>>
    }
  }
  'admin.move_category': {
    methods: ["POST"]
    pattern: '/api/admin/categories/:id/move'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/admin').directionValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/admin').directionValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['moveCategory']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['moveCategory']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['moveCategory']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.users': {
    methods: ["GET","HEAD"]
    pattern: '/api/admin/users'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/admin').userSearchValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['users']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['users']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['users']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.suspend': {
    methods: ["POST"]
    pattern: '/api/admin/users/:id/suspend'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['suspend']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['suspend']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['suspend']>>>
    }
  }
  'admin.reinstate': {
    methods: ["POST"]
    pattern: '/api/admin/users/:id/reinstate'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['reinstate']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['reinstate']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['reinstate']>>>
    }
  }
  'event_stream': {
    methods: ["GET","HEAD"]
    pattern: '/api/__transmit/events'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
      rawResponse: ExtractRawResponse<unknown>
    }
  }
  'subscribe': {
    methods: ["POST"]
    pattern: '/api/__transmit/subscribe'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
      rawResponse: ExtractRawResponse<unknown>
    }
  }
  'unsubscribe': {
    methods: ["POST"]
    pattern: '/api/__transmit/unsubscribe'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
      rawResponse: ExtractRawResponse<unknown>
    }
  }
}
