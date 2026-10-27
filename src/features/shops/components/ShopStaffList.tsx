import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initials } from '@/lib/format'
import type { StaffMember } from '@/types/business'

/** Staff shown only when the shop keeps staff records (plan C15). */
export function ShopStaffList({ staff }: { staff: StaffMember[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {staff.map((member) => (
        <li key={member.id} className="flex items-center gap-3 rounded-2xl card-surface p-3">
          <Avatar className="size-12">
            {member.avatarUrl ? <AvatarImage src={member.avatarUrl} alt="" /> : null}
            <AvatarFallback className="bg-secondary font-semibold text-secondary-foreground">
              {initials(member.displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-semibold">{member.displayName}</p>
            {member.title ? <p className="truncate text-xs text-muted-foreground">{member.title}</p> : null}
          </div>
        </li>
      ))}
    </ul>
  )
}
