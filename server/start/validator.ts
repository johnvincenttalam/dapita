/*
|--------------------------------------------------------------------------
| Validator file
|--------------------------------------------------------------------------
|
| The validator file is used for configuring global transforms for VineJS.
| The transform below converts all VineJS date outputs from JavaScript
| Date objects to Luxon DateTime instances, so that validated dates are
| ready to use with Lucid models and other parts of the app that expect
| Luxon DateTime.
|
*/

import { DateTime } from 'luxon'
import vine, { SimpleMessagesProvider, VineDate } from '@vinejs/vine'

declare module '@vinejs/vine/types' {
  interface VineGlobalTransforms {
    date: DateTime
  }
}

VineDate.transform((value) => DateTime.fromJSDate(value))

/**
 * Messages worded like the SPA's own form errors (src/schemas), for the
 * rare request that skips the form checks.
 */
vine.messagesProvider = new SimpleMessagesProvider({
  'required': 'Fill in {{ field }}.',
  'email': 'Enter a valid email address',
  'enum': 'Choose a valid {{ field }}.',
  'maxLength': '{{ field }} must be {{ max }} characters or fewer',
  'password.minLength': 'Password must be at least 8 characters',
  'password.regex': 'Password must contain a letter and a number',
  'phone.regex': 'Enter a mobile number like 0917 123 4567',
  'body.minLength': 'Write a message',
  'body.maxLength': 'Keep messages to 2,000 characters or fewer',
  'reason.minLength': 'Tell us what happened in at least 5 characters',
})
