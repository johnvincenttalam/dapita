/*
|--------------------------------------------------------------------------
| Background jobs
|--------------------------------------------------------------------------
|
| Requests expire when their response deadline passes. Reads expire them too,
| but this timer makes sure both sides hear about it live even when nobody is
| looking at bookings. Runs in the web server only (not in tests or ace).
|
*/

import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { expireOverdue } from '#services/bookings'

const EVERY_MINUTE = 60_000

const timer = setInterval(() => {
  expireOverdue().catch((error) => logger.error({ err: error }, 'Expiring overdue bookings failed'))
}, EVERY_MINUTE)

app.terminating(() => clearInterval(timer))
