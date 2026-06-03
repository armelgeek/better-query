import nodemailer from "nodemailer";
import { Plugin, PluginInitContext } from "../types/plugins";

export interface MailPluginOptions {
	host?: string;
	port?: number;
	secure?: boolean;
	auth?: {
		user: string;
		pass: string;
	};
	from?: string;
	templates?: Record<
		string,
		(args: any) => { subject: string; text?: string; html?: string }
	>;
}

export interface MailPluginInstance extends Plugin {
	sendMail: (params: {
		to: string;
		subject: string;
		text?: string;
		html?: string;
	}) => Promise<any>;
	sendTemplate: (
		to: string,
		templateName: string,
		args: any,
	) => Promise<any>;
}

/**
 * Mail plugin for BetterQuery using Nodemailer
 */
export function mailPlugin(options: MailPluginOptions = {}): MailPluginInstance {
	// Fallback to environment variables if options are not explicitly provided
	const host = options.host || process.env.SMTP_HOST || "localhost";
	const port = options.port || Number(process.env.SMTP_PORT || "587");
	const secure =
		options.secure !== undefined
			? options.secure
			: process.env.SMTP_SECURE === "true";
	const user = options.auth?.user || process.env.SMTP_USER;
	const pass = options.auth?.pass || process.env.SMTP_PASSWORD;
	const defaultFrom =
		options.from ||
		process.env.EMAIL_FROM ||
		(user ? `BetterQuery <${user}>` : "BetterQuery <noreply@localhost>");

	// Create transporter only if host is present
	let transporter: nodemailer.Transporter | null = null;
	if (host && host !== "localhost" && host !== "127.0.0.1" && host !== "0.0.0.0") {
		const transportConfig: any = {
			host,
			port,
			secure,
			tls: {
				rejectUnauthorized: false, // Permissive TLS for development
			},
		};
		if (user && pass) {
			transportConfig.auth = { user, pass };
		}
		transporter = nodemailer.createTransport(transportConfig);
	} else if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") {
		// SMTP running on localhost (like Mailpit)
		const transportConfig: any = {
			host,
			port,
			secure,
			tls: {
				rejectUnauthorized: false,
			},
		};
		if (user && pass) {
			transportConfig.auth = { user, pass };
		}
		transporter = nodemailer.createTransport(transportConfig);
	} else {
		console.warn(
			"[Mail Plugin] SMTP host configurations missing. Mail plugin will run in mock/log mode.",
		);
	}

	const templates = options.templates || {};

	/**
	 * Send direct email
	 */
	const sendMail = async (params: {
		to: string;
		subject: string;
		text?: string;
		html?: string;
	}): Promise<any> => {
		const mailOptions = {
			from: defaultFrom,
			to: params.to,
			subject: params.subject,
			text: params.text,
			html: params.html,
		};

		if (transporter) {
			try {
				const info = await transporter.sendMail(mailOptions);
				return info;
			} catch (error) {
				console.error("[Mail Plugin] Error sending email:", error);
				throw error;
			}
		} else {
			console.log(
				`[Mail Plugin MOCK] Sending email to ${params.to} with subject "${params.subject}"`,
			);
			return { messageId: "mock-id-" + Date.now(), accepted: [params.to] };
		}
	};

	/**
	 * Send email using a registered template
	 */
	const sendTemplate = async (
		to: string,
		templateName: string,
		args: any,
	): Promise<any> => {
		const templateFn = templates[templateName];
		if (!templateFn) {
			throw new Error(`[Mail Plugin] Template "${templateName}" not found`);
		}

		const rendered = templateFn(args);
		return sendMail({
			to,
			subject: rendered.subject,
			text: rendered.text,
			html: rendered.html,
		});
	};

	return {
		id: "mail",
		init: (ctx: PluginInitContext) => {
			// Attach helper methods to the adapter context so hooks can easily access them via ctx.adapter.mail
			if (ctx.adapter) {
				ctx.adapter.mail = {
					sendMail,
					sendTemplate,
				};
			}
		},
		sendMail,
		sendTemplate,
	};
}
