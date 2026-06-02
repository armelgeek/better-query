import { DocsBody, DocsPage, DocsTitle } from "@/components/docs/page";
import {
	CodeBlock,
	CodeBlockTab,
	CodeBlockTabs,
	CodeBlockTabsList,
	Pre,
} from "@/components/ui/code-block";
import { source } from "@/lib/source";
import { absoluteUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";
import defaultMdxComponents from "fumadocs-ui/mdx";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LLMCopyButton, ViewOptions } from "./page.client";

export default async function Page({
	params,
}: {
	params: Promise<{ slug?: string[] }>;
}) {
	const { slug } = await params;
	if (!slug || slug.length === 0) {
		redirect("/docs/introduction");
	}
	const page = source.getPage(slug);

	if (!page) {
		notFound();
	}

	const MDX = page.data.body;
	const avoidLLMHeader = ["Introduction", "Comparison"];
	return (
		<DocsPage
			toc={page.data.toc}
			full={page.data.full}
			editOnGithub={{
				owner: "armelgeek",
				repo: "better-query",
				sha: "main",
				path: `/docs/content/docs/${page.path}`,
			}}
			tableOfContent={{
				header: <div className="w-10 h-4"></div>,
			}}
		>
			<DocsTitle>{page.data.title}</DocsTitle>
			{!avoidLLMHeader.includes(page.data.title) && (
				<div className="flex flex-row gap-2 items-center pb-3 border-b">
					<LLMCopyButton />
					<ViewOptions
						markdownUrl={`${page.url}.mdx`}
						githubUrl={`https://github.com/armelgeek/better-query/blob/main/docs/content/docs/${page.file.path}`}
					/>
				</div>
			)}
			<DocsBody>
				<MDX
					components={{
						...defaultMdxComponents,
						CodeBlockTabs: (props) => {
							return (
								<CodeBlockTabs
									{...props}
									className="p-0 border-0 rounded-lg bg-fd-secondary"
								>
									<div {...props}>{props.children}</div>
								</CodeBlockTabs>
							);
						},
						CodeBlockTabsList: (props) => {
							return (
								<CodeBlockTabsList
									{...props}
									className="pb-0 my-0 rounded-lg bg-fd-secondary"
								/>
							);
						},
						CodeBlockTab: (props) => {
							return <CodeBlockTab {...props} className="p-0 m-0 rounded-lg" />;
						},
						pre: (props) => {
							return (
								<CodeBlock className="rounded-xl bg-fd-muted" {...props}>
									<div style={{ minWidth: "100%", display: "table" }}>
										<Pre className="px-0 py-3 bg-fd-muted focus-visible:outline-none">
											{props.children}
										</Pre>
									</div>
								</CodeBlock>
							);
						},
						Link: ({
							className,
							...props
						}: React.ComponentProps<typeof Link>) => (
							<Link
								className={cn(
									"font-medium underline underline-offset-4",
									className,
								)}
								{...props}
							/>
						),
					}}
				/>
			</DocsBody>
		</DocsPage>
	);
}

export async function generateStaticParams() {
	const params = source.generateParams();
	return [
		{ slug: [] },
		...params,
	];
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ slug?: string[] }>;
}) {
	const { slug } = await params;
	if (!slug || slug.length === 0) {
		return {
			title: "Better Query Documentation",
			description: "Standardized query and mutation layer built on Zod, TanStack Query, and framework-agnostic APIs.",
		};
	}
	const page = source.getPage(slug);
	if (page == null) notFound();
	const baseUrl =
		process.env.NEXT_PUBLIC_URL ||
		process.env.VERCEL_URL ||
		process.env.NEXT_PUBLIC_APP_URL ||
		"http://localhost:3000";
	const url = new URL(`${baseUrl}/api/og`);
	const { title, description } = page.data;
	const pageSlug = page.file.path;
	url.searchParams.set("type", "Documentation");
	url.searchParams.set("mode", "dark");
	url.searchParams.set("heading", `${title}`);

	return {
		title,
		description,
		openGraph: {
			title,
			description,
			type: "website",
			url: absoluteUrl(`docs/${pageSlug}`),
			images: [
				{
					url: url.toString(),
					width: 1200,
					height: 630,
					alt: title,
				},
			],
		},
		twitter: {
			card: "summary_large_image",
			title,
			description,
			images: [url.toString()],
		},
	};
}
