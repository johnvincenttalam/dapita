import type { HttpContext } from '@adonisjs/core/http'
import { requireMember } from '#services/accounts'
import {
  getConversation,
  listBusinessConversations,
  listMyConversations,
  markRead,
  reportConversation,
  sendMessage,
  startConversation,
} from '#services/conversations'
import {
  messageValidator,
  reportValidator,
  startConversationValidator,
} from '#validators/conversation'

export default class ConversationsController {
  async index({ auth }: HttpContext) {
    return listMyConversations(auth.getUserOrFail())
  }

  async store({ auth, request }: HttpContext) {
    const input = await request.validateUsing(startConversationValidator)
    return startConversation(auth.getUserOrFail(), input)
  }

  async businessIndex({ auth, params }: HttpContext) {
    await requireMember(auth.getUserOrFail(), params.businessId)
    return listBusinessConversations(params.businessId)
  }

  async show({ auth, params }: HttpContext) {
    return getConversation(auth.getUserOrFail(), params.id)
  }

  async sendMessage({ auth, params, request }: HttpContext) {
    const { body } = await request.validateUsing(messageValidator)
    return sendMessage(auth.getUserOrFail(), params.id, body)
  }

  async markRead({ auth, params, response }: HttpContext) {
    await markRead(auth.getUserOrFail(), params.id)
    return response.noContent()
  }

  async report({ auth, params, request, response }: HttpContext) {
    const { reason } = await request.validateUsing(reportValidator)
    await reportConversation(auth.getUserOrFail(), params.id, reason)
    return response.noContent()
  }
}
