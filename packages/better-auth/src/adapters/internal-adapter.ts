import { alphabet, generateRandomString } from "oslo/crypto";
import { BetterAuthOptions } from "../types";
import { Adapter } from "../types/adapter";
import { getDate } from "../utils/date";
import { getAuthTables } from "./get-tables";
import { Account, Session, User } from "./schema";

export const createInternalAdapter = (
	adapter: Adapter,
	options: BetterAuthOptions,
) => {
	const sessionExpiration = options.session?.expiresIn || 60 * 60 * 24 * 7; // 7 days
	const tables = getAuthTables(options);
	return {
		createOAuthUser: async (user: User, account: Account) => {
			try {
				const createdUser = await adapter.create({
					model: tables.user.tableName,
					data: user,
				});
				const createdAccount = await adapter.create({
					model: tables.account.tableName,
					data: account,
				});
				return {
					user: createdUser,
					account: createdAccount,
				};
			} catch (e) {
				console.log(e);
				return null;
			}
		},
		createUser: async (user: User) => {
			const createdUser = await adapter.create<User>({
				model: tables.user.tableName,
				data: user,
			});
			return createdUser;
		},
		createSession: async (userId: string) => {
			const data = {
				id: generateRandomString(32, alphabet("a-z", "0-9", "A-Z")),
				userId,
				expiresAt: getDate(sessionExpiration),
			};
			const session = adapter.create<Session>({
				model: tables.session.tableName,
				data,
			});
			return session;
		},
		findSession: async (sessionId: string) => {
			const session = await adapter.findOne<Session>({
				model: tables.session.tableName,
				where: [
					{
						value: sessionId,
						field: "id",
					},
				],
			});
			if (!session) {
				return null;
			}
			const user = await adapter.findOne<User>({
				model: tables.user.tableName,
				where: [
					{
						value: session.userId,
						field: "id",
					},
				],
			});
			if (!user) {
				return null;
			}
			return {
				session,
				user,
			};
		},
		updateSession: async (session: Session) => {
			const updateAge =
				options.session?.updateAge === undefined
					? 60 * 60 * 24
					: options.session?.updateAge;
			const updateDate = updateAge === 0 ? 0 : getDate(updateAge).valueOf();
			const maxAge = getDate(sessionExpiration);
			const shouldBeUpdated =
				session.expiresAt.valueOf() - maxAge.valueOf() + updateDate <=
				Date.now();
			if (shouldBeUpdated) {
				const updatedSession = await adapter.update<Session>({
					model: tables.session.tableName,
					where: [
						{
							field: "id",
							value: session.id,
						},
					],
					update: {
						...session,
						expiresAt: new Date(Date.now() + sessionExpiration),
					},
				});
				return updatedSession;
			}
			const updatedSession = await adapter.update<Session>({
				model: tables.session.tableName,
				where: [
					{
						field: "id",
						value: session.id,
					},
				],
				update: session,
			});
			return updatedSession;
		},
		deleteSession: async (id: string) => {
			const session = await adapter.delete<Session>({
				model: tables.session.tableName,
				where: [
					{
						field: "id",
						value: id,
					},
				],
			});
			return session;
		},
		findUserByEmail: async (email: string) => {
			const user = await adapter.findOne<User>({
				model: tables.user.tableName,
				where: [
					{
						value: email,
						field: "email",
					},
				],
			});
			if (!user) return null;
			const accounts = await adapter.findMany<Account>({
				model: tables.account.tableName,
				where: [
					{
						value: user.id,
						field: "userId",
					},
				],
			});
			return {
				user,
				accounts,
			};
		},
		findUserById: async (userId: string) => {
			const user = await adapter.findOne<User>({
				model: tables.user.tableName,
				where: [
					{
						field: "id",
						value: userId,
					},
				],
			});
			return user;
		},
		linkAccount: async (account: Account) => {
			const _account = await adapter.create<Account>({
				model: tables.account.tableName,
				data: account,
			});
			return _account;
		},
	};
};

export type InternalAdapter = ReturnType<typeof createInternalAdapter>;
