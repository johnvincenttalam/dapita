/**
 * `cn` merges class names and resolves Tailwind conflicts (last one wins):
 * cn('px-2 text-sm', isActive && 'px-4') → 'text-sm px-4'
 *
 * It comes from shadcn's `cn` package, a compiled drop-in replacement for clsx + tailwind-merge.
 * Generated shadcn/ui components import it from "cn" directly; app code imports it from here.
 */
export { cn } from 'cn'
