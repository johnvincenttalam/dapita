import {
  CalendarDaysIcon,
  ChevronDownIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MessageCircleIcon,
  PaletteIcon,
  ShieldIcon,
  StoreIcon,
  UserIcon,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { themeOptions } from '@/config/theme-options'
import { useSession, useSignOutMutation } from '@/features/auth/api/queries'
import { useTheme } from '@/hooks/use-theme'
import { initials } from '@/lib/format'
import { hasAnyRole, roleGroups } from '@/lib/roles'
import { isTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

interface UserMenuProps {
  /** `avatar`: icon button (marketplace header). `detailed`: avatar, name and role (dashboard top bar, design screen 12). */
  display?: 'avatar' | 'detailed'
  /** Overrides the name on the trigger, e.g. the business name in the merchant dashboard. */
  title?: string
  subtitle?: string
}

/** Account menu for the signed-in user. Links depend on the user's roles. */
export function UserMenu({ display = 'avatar', title, subtitle }: UserMenuProps) {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const { user } = useSession()
  const signOut = useSignOutMutation()
  if (!user) return null

  const label = title ?? user.name
  const isCustomer = hasAnyRole(user, roleGroups.customer)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={display === 'avatar' ? 'icon' : 'default'}
          className={cn(display === 'avatar' ? 'rounded-full' : 'h-auto gap-2.5 px-1.5 py-1 text-left')}
          aria-label={`Account menu for ${user.name}`}
        >
          <Avatar className="size-8">
            <AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">
              {initials(label)}
            </AvatarFallback>
          </Avatar>
          {display === 'detailed' ? (
            <>
              <span className="hidden min-w-0 flex-col sm:flex">
                <span className="max-w-44 truncate text-sm font-semibold">{label}</span>
                {subtitle ? <span className="text-xs font-normal text-muted-foreground">{subtitle}</span> : null}
              </span>
              <ChevronDownIcon aria-hidden="true" className="hidden text-muted-foreground sm:block" />
            </>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-sm font-medium">{user.name}</span>
          <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isCustomer ? (
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link to="/bookings">
                <CalendarDaysIcon aria-hidden="true" />
                My bookings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/inbox">
                <MessageCircleIcon aria-hidden="true" />
                Inbox
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/account">
                <UserIcon aria-hidden="true" />
                Profile
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        ) : null}
        {hasAnyRole(user, roleGroups.merchant) || hasAnyRole(user, roleGroups.admin) ? (
          <>
            {isCustomer ? <DropdownMenuSeparator /> : null}
            <DropdownMenuGroup>
              {hasAnyRole(user, roleGroups.merchant) ? (
                <DropdownMenuItem asChild>
                  <Link to="/business">
                    <LayoutDashboardIcon aria-hidden="true" />
                    Business dashboard
                  </Link>
                </DropdownMenuItem>
              ) : null}
              {hasAnyRole(user, roleGroups.admin) ? (
                <DropdownMenuItem asChild>
                  <Link to="/admin">
                    <ShieldIcon aria-hidden="true" />
                    Admin console
                  </Link>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem asChild>
                <Link to="/">
                  <StoreIcon aria-hidden="true" />
                  Marketplace
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <PaletteIcon aria-hidden="true" />
            Theme
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={theme} onValueChange={(value) => isTheme(value) && setTheme(value)}>
              {themeOptions.map(({ value, label: optionLabel, icon: Icon }) => (
                <DropdownMenuRadioItem key={value} value={value}>
                  <Icon aria-hidden="true" />
                  {optionLabel}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={signOut.isPending}
          onSelect={() => {
            signOut.mutate(undefined, { onSuccess: () => void navigate('/') })
          }}
        >
          <LogOutIcon aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
