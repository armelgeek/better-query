import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "BetterQuery Demo - Next.js App",
	description:
		"Demo application showcasing BetterQuery integration with Next.js",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className="font-sans">{children}</body>
		</html>
	);
}
