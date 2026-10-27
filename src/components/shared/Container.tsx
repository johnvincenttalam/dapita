import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

const containerVariants = cva('mx-auto w-full px-4 sm:px-6 lg:px-8', {
  variants: {
    size: {
      sm: 'max-w-(--container-prose)',
      md: 'max-w-4xl',
      lg: 'max-w-6xl',
      xl: 'max-w-7xl',
      full: 'max-w-none',
    },
  },
  defaultVariants: { size: 'xl' },
})

type ContainerElement = 'div' | 'section' | 'main' | 'header' | 'footer' | 'article'

export interface ContainerProps extends ComponentProps<'div'>, VariantProps<typeof containerVariants> {
  as?: ContainerElement
}

/** Horizontally centred page column with the standard gutters and max widths. */
export function Container({ as: Component = 'div', size, className, ...props }: ContainerProps) {
  return <Component data-slot="container" className={cn(containerVariants({ size }), className)} {...props} />
}
