import { CopyIcon, MoreHorizontalIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDeleteCustomerMutation } from '@/features/dashboard/api/queries'
import type { Customer } from '@/types/domain'

export function CustomerRowActions({ customer }: { customer: Customer }) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const deleteCustomer = useDeleteCustomerMutation()

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(customer.email)
      toast.success('Email copied to clipboard')
    } catch {
      toast.error('Clipboard access was blocked by the browser')
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${customer.name}`}>
            <MoreHorizontalIcon aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{customer.name}</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => void copyEmail()}>
            <CopyIcon aria-hidden="true" />
            Copy email
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
            <Trash2Icon aria-hidden="true" />
            Delete customer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        destructive
        title={`Delete ${customer.name}?`}
        description="This removes the customer from the mock dataset until you reload the page. No real data is affected."
        confirmLabel="Delete customer"
        onConfirm={() => deleteCustomer.mutateAsync(customer.id)}
      />
    </>
  )
}
