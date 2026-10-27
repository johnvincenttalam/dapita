import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useSession } from '@/features/auth/api/queries'
import { hasAnyRole } from '@/lib/roles'
import { conversationsService, type StartConversationInput } from '@/services/conversations.service'
import type { ConversationDetails } from '@/types/message'

export const conversationKeys = {
  all: ['conversations'] as const,
  mine: () => [...conversationKeys.all, 'mine'] as const,
  business: (businessId: string) => [...conversationKeys.all, 'business', businessId] as const,
  detail: (id: string) => [...conversationKeys.all, 'detail', id] as const,
}

// With the server, realtime events (features/realtime) refresh these the moment something
// changes. Polling and window focus stay as the fallback, and are all mock mode has.
const live = { refetchInterval: 15_000, refetchOnWindowFocus: 'always' } as const

export function useMyConversationsQuery({ enabled = true } = {}) {
  return useQuery({
    queryKey: conversationKeys.mine(),
    queryFn: () => conversationsService.listMyConversations(),
    enabled,
    ...live,
  })
}

export function useBusinessConversationsQuery(businessId: string | undefined) {
  return useQuery({
    queryKey: conversationKeys.business(businessId ?? ''),
    queryFn: () => conversationsService.listBusinessConversations(businessId ?? ''),
    enabled: Boolean(businessId),
    ...live,
  })
}

export function useConversationQuery(id: string | undefined) {
  return useQuery({
    queryKey: conversationKeys.detail(id ?? ''),
    queryFn: () => conversationsService.getConversation(id ?? ''),
    enabled: Boolean(id),
    ...live,
  })
}

/** Unread messages across the signed-in customer's conversations, for the Inbox nav item. 0 for anyone else. */
export function useUnreadMessageCount() {
  const { user } = useSession()
  const conversations = useMyConversationsQuery({ enabled: hasAnyRole(user, ['customer']) })
  return conversations.data?.reduce((total, conversation) => total + conversation.unreadCount, 0) ?? 0
}

export function useStartConversationMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: StartConversationInput) => conversationsService.startConversation(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: conversationKeys.mine() }),
  })
}

/** The composer shows its own error and keeps the draft, so no toast. */
export function useSendMessageMutation(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    meta: { showErrorToast: false },
    mutationFn: (body: string) => conversationsService.sendMessage(id, body),
    onSuccess: (message) => {
      queryClient.setQueryData<ConversationDetails>(conversationKeys.detail(id), (thread) =>
        thread ? { ...thread, messages: [...thread.messages, message], lastMessage: message } : thread,
      )
      return queryClient.invalidateQueries({ queryKey: conversationKeys.all })
    },
  })
}

/** Quiet: a failed read receipt isn't worth interrupting anyone for. */
export function useMarkReadMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    meta: { showErrorToast: false },
    mutationFn: (id: string) => conversationsService.markRead(id),
    onSuccess: (_, id) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: conversationKeys.mine() }),
        queryClient.invalidateQueries({ queryKey: [...conversationKeys.all, 'business'] }),
        queryClient.invalidateQueries({ queryKey: conversationKeys.detail(id) }),
      ]),
  })
}

export function useReportConversationMutation(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    meta: { showErrorToast: false },
    mutationFn: (reason: string) => conversationsService.reportConversation(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: conversationKeys.detail(id) }),
  })
}
