"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap font-black uppercase tracking-widest ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-2 select-none",
    {
        variants: {
            variant: {
                default: "bg-black text-white hover:bg-neutral-800 hover:scale-[1.02] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-[6px_6px_0px_0px_rgba(255,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all duration-200",
                destructive:
                    "bg-red-600 text-white hover:bg-red-700 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
                outline:
                    "border-black bg-white text-black hover:bg-neutral-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
                secondary:
                    "bg-neutral-200 text-black hover:bg-neutral-300",
                ghost: "hover:bg-neutral-100 hover:text-black border-transparent",
                link: "text-black underline-offset-4 hover:underline border-transparent shadow-none",
            },
            size: {
                default: "h-16 px-10 text-xl",
                sm: "h-12 px-6 text-base",
                lg: "h-20 md:h-24 px-12 md:px-16 text-2xl md:text-3xl",
                icon: "h-16 w-16",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        if (asChild) {
            return (
                <Slot
                    className={cn(buttonVariants({ variant, size, className }))}
                    ref={ref}
                    {...props}
                />
            )
        }

        return (
            <motion.button
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                {...(props as React.ComponentProps<typeof motion.button>)}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
