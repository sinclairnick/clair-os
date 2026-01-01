import { cn } from "@/lib/utils";
import React from "react";

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode;
}

function PageHeader({ className, children, ...props }: PageHeaderProps) {
	return (
		<div
			className={cn(
				"flex flex-col gap-4 md:flex-row md:items-start md:justify-between py-4",
				className
			)}
			{...props}
		>
			{children}
		</div>
	);
}

interface PageHeaderHeadingProps extends React.HTMLAttributes<HTMLDivElement> {
	title?: string;
	description?: string;
}

function PageHeaderHeading({
	className,
	title,
	description,
	children,
	...props
}: PageHeaderHeadingProps) {
	return (
		<div className={cn("flex flex-col gap-1", className)} {...props}>
			{title && (
				<h1 className="text-2xl font-bold tracking-tight text-foreground">
					{title}
				</h1>
			)}
			{description && (
				<p className="text-muted-foreground">{description}</p>
			)}
			{children}
		</div>
	);
}

interface PageHeaderActionsProps extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode;
}

function PageHeaderActions({
	className,
	children,
	...props
}: PageHeaderActionsProps) {
	return (
		<div
			className={cn(
				// Mobile: Grid layout where items span 1 col by default
				// Logic: Last item spans 2 cols if it's the odd one out (using nth-child logic)
				"grid grid-cols-2 gap-2 w-full",
				"[&>*:last-child:nth-child(odd)]:col-span-2",
				// Desktop: Flex row, auto width
				"md:flex md:w-auto md:gap-2",
				// Reset children styling for desktop
				"md:[&>*]:col-span-1 md:[&>*]:w-auto",
				className
			)}
			{...props}
		>
			{children}
		</div>
	);
}

export { PageHeader, PageHeaderHeading, PageHeaderActions };
