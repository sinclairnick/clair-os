import { Badge } from "@/components/ui/badge";
import { Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignatureBadgeProps {
	className?: string;
	size?: "sm" | "md" | "lg";
}

export function SignatureBadge({ className, size = "md" }: SignatureBadgeProps) {
	const sizeClasses = {
		sm: "px-2 py-0.5 gap-1 text-[10px]",
		md: "px-3 py-1 gap-1.5 text-[11px]",
		lg: "pl-3 pr-5 py-2 gap-2.5 text-sm",
	};

	const iconSize = {
		sm: "w-3 h-3",
		md: "w-3.5 h-3.5",
		lg: "w-5 h-5",
	};

	return (
		<Badge
			className={cn(
				"bg-gradient-to-br from-[#BF953F] via-[#FCF6BA] to-[#AA771C] text-amber-950 border-none shadow-[0_2px_12px_rgba(184,134,11,0.4)] font-semibold tracking-tight transition-transform duration-500",
				sizeClasses[size],
				className
			)}
		>
			<Award className={cn(iconSize[size], "fill-amber-950/20")} />
			Signature dish
		</Badge>
	);
}
