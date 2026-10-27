import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { customerEmail, goodCutId, ownerEmail, recordBroadcasts, userByEmail } from '#tests/helpers'
import type { ConversationDetails, ConversationSummary } from '#shared/domain'

test.group('Conversations', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a message shows as unread for the shop and is pushed to both sides', async ({
    client,
    assert,
  }) => {
    const customer = await userByEmail(customerEmail)
    const owner = await userByEmail(ownerEmail)
    const unreadFor = async (conversationId: string) => {
      const list = await client
        .get(`/api/merchant/businesses/${goodCutId}/conversations`)
        .loginAs(owner)
      return list.body().find((item: { id: string }) => item.id === conversationId)
    }
    const broadcasts = recordBroadcasts()

    const started = await client
      .post('/api/conversations')
      .json({ businessId: goodCutId })
      .loginAs(customer)
    started.assertStatus(200)
    const id = (started.body() as ConversationSummary).id
    const threadBefore = await unreadFor(id)
    const before = threadBefore?.unreadCount ?? 0

    const sent = await client
      .post(`/api/conversations/${id}/messages`)
      .json({ body: 'Do you take walk-ins today?' })
      .loginAs(customer)
    sent.assertStatus(200)
    assert.equal(sent.body().senderRole, 'customer')

    const thread = await unreadFor(id)
    assert.equal(thread.unreadCount, before + 1)
    assert.equal(thread.lastMessage.body, 'Do you take walk-ins today?')

    await client.post(`/api/conversations/${id}/read`).loginAs(owner)
    const afterRead = await client.get(`/api/conversations/${id}`).loginAs(owner)
    const details = afterRead.body() as ConversationDetails
    assert.equal(details.unreadCount, 0)
    assert.exists(details.messages.at(-1)?.readAt)

    broadcasts.stop()
    const event = { type: 'conversation.changed', conversationId: id }
    assert.deepInclude(broadcasts.events, { channel: `businesses/${goodCutId}`, payload: event })
    assert.deepInclude(broadcasts.events, { channel: `users/${customer.id}`, payload: event })
  })

  test('outsiders get a 404 for a conversation', async ({ client }) => {
    const customer = await userByEmail(customerEmail)
    const stranger = await userByEmail('john@example.com')
    const started = await client
      .post('/api/conversations')
      .json({ businessId: goodCutId })
      .loginAs(customer)

    const response = await client
      .get(`/api/conversations/${(started.body() as ConversationSummary).id}`)
      .loginAs(stranger)
    response.assertStatus(404)
  })
})
