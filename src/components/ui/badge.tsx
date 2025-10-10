import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '~/lib/utils/cn'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide',
  {
    variants: {
      variant: {
        default: 'border-neutral-200 bg-neutral-900 text-white',
        outline: 'border-neutral-300 text-neutral-700',
        subtle: 'border-transparent bg-neutral-100 text-neutral-800',
        success: 'border-transparent bg-green-600 text-white',
        warning: 'border-transparent bg-amber-500 text-white',
        danger: 'border-transparent bg-red-600 text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
