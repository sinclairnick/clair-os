import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Image as ImageIcon } from "lucide-react";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
	src: string;
	alt: string;
	containerClassName?: string;
	imageClassName?: string;
}

export function LazyImage({
	src,
	alt,
	containerClassName,
	imageClassName,
	...props
}: LazyImageProps) {
	const [isLoaded, setIsLoaded] = useState(false);
	const [isInView, setIsInView] = useState(false);
	const imgRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setIsInView(true);
					observer.disconnect();
				}
			},
			{
				rootMargin: "200px", // Start loading 200px before it enters the viewport
			}
		);

		if (imgRef.current) {
			observer.observe(imgRef.current);
		}

		return () => {
			observer.disconnect();
		};
	}, []);

	return (
		<div
			ref={imgRef}
			className={cn("relative overflow-hidden bg-muted flex items-center justify-center", containerClassName)}
		>
			{isInView ? (
				<img
					src={src}
					alt={alt}
					onLoad={() => setIsLoaded(true)}
					className={cn(
						"w-full h-full object-cover transition-opacity duration-500",
						isLoaded ? "opacity-100" : "opacity-0",
						imageClassName
					)}
					{...props}
				/>
			) : null}

			{!isLoaded && (
				<div className="absolute inset-0 flex items-center justify-center bg-muted/50 animate-pulse">
					<ImageIcon className="w-8 h-8 text-muted-foreground/20" />
				</div>
			)}
		</div>
	);
}
