import * as React from "react"

import { cn } from "@/lib/utils"

function Card({
	className,
	size = "default",
	...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
	return (
		<div
			data-slot="card"
			data-size={size}
			className={cn(
				// Mobile: transparent, no ring, full-width via negative margin
				"-mx-1 px-2 md:mx-0 md:px-0",
				// Desktop: styled card with background and ring
				"md:ring-foreground/10 md:bg-card md:ring-1 md:rounded-lg",
				// Common styles
				"text-card-foreground gap-4 md:gap-4 overflow-hidden py-4 md:py-4 text-xs/relaxed",
				"has-[>img:first-child]:pt-0 has-[>div:first-child>img]:pt-0",
				"data-[size=sm]:gap-3 md:data-[size=sm]:gap-3 data-[size=sm]:py-3 md:data-[size=sm]:py-3",
				"*:[img:first-child]:rounded-t-lg *:[img:last-child]:rounded-b-lg",
				"group/card flex flex-col",
				className
			)}
			{...props}
		/>
	)
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-header"
			className={cn(
				// Mobile: no horizontal padding (handled by Card), use border-b for separation
				// Desktop: normal padding
				"gap-1.5 md:gap-1 md:rounded-t-lg px-0 md:px-4",
				"group-data-[size=sm]/card:px-0 md:group-data-[size=sm]/card:px-3",
				"pb-3 md:pb-0 md:[.border-b]:pb-4 border-b md:border-b",
				"group-data-[size=sm]/card:pb-2 md:group-data-[size=sm]/card:[.border-b]:pb-3",
				"group/card-header @container/card-header grid auto-rows-min items-start",
				"has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto]",
				className
			)}
			{...props}
		/>
	)
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-title"
			className={cn("text-base md:text-sm font-semibold md:font-medium", className)}
			{...props}
		/>
	)
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-description"
			className={cn("text-muted-foreground text-xs/relaxed", className)}
			{...props}
		/>
	)
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-action"
			className={cn(
				"col-start-2 row-span-2 row-start-1 self-start justify-self-end",
				className
			)}
			{...props}
		/>
	)
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-content"
			className={cn("px-0 md:px-4 group-data-[size=sm]/card:px-0 md:group-data-[size=sm]/card:px-3", className)}
			{...props}
		/>
	)
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-footer"
			className={cn(
				"md:rounded-b-lg px-0 md:px-4",
				"group-data-[size=sm]/card:px-0 md:group-data-[size=sm]/card:px-3",
				"pt-3 md:pt-0 md:[.border-t]:pt-4 border-t md:border-t",
				"group-data-[size=sm]/card:pt-2 md:group-data-[size=sm]/card:[.border-t]:pt-3",
				"flex items-center",
				className
			)}
			{...props}
		/>
	)
}

export {
	Card,
	CardHeader,
	CardFooter,
	CardTitle,
	CardAction,
	CardDescription,
	CardContent,
}
