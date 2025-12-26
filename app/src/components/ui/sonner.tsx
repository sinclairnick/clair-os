import { useTheme } from "@/components/theme-provider"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
	const { theme = "system" } = useTheme()

	return (
		<Sonner
			theme={theme as ToasterProps["theme"]}
			className="toaster group"
			icons={{
				success: (
					<CircleCheckIcon className="size-4 text-emerald-700 darK:text-emerald-400" />
				),
				info: (
					<InfoIcon className="size-4" />
				),
				warning: (
					<TriangleAlertIcon className="size-4 text-orange-700 dark:text-orange-400" />
				),
				error: (
					<OctagonXIcon className="size-4 text-red-700 dark:text-red-400" />
				),
				loading: (
					<Loader2Icon className="size-4 animate-spin" />
				),
			}}
			style={
				{
					"--normal-bg": "var(--popover)",
					"--normal-text": "var(--popover-foreground)",
					"--normal-border": "var(--border)",
					"--border-radius": "1000px",
				} as React.CSSProperties
			}
			toastOptions={{
				classNames: {
					toast: "cn-toast",
				},
			}}
			{...props}
		/>
	)
}

export { Toaster }
