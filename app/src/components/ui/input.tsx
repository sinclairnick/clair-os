import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
	return (
		<InputPrimitive
			type={type}
			data-slot="input"
			className={cn(
				"bg-input/20 dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 h-10 md:h-7 rounded-md border px-3 md:px-2 py-1 md:py-0.5 text-[16px] md:text-xs/relaxed transition-colors file:h-8 md:file:h-6 file:text-sm md:file:text-xs/relaxed file:font-medium focus-visible:ring-[2px] aria-invalid:ring-[2px] file:text-foreground placeholder:text-muted-foreground w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-transparent disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
				className
			)}
			{...props}
		/>
	)
}

export { Input }
