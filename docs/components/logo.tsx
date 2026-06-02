import { cn } from "@/lib/utils";
import { SVGProps } from "react";

export const Logo = ({
	width = 24,
	height = 24,
	className,
	...props
}: SVGProps<SVGSVGElement>) => {
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.5"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={cn("text-black dark:text-white", className)}
			{...props}
		>
			<path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" fillOpacity="0.15" />
			<path d="M2 17l10 5 10-5" />
			<path d="M2 12l10 5 10-5" />
		</svg>
	);
};
