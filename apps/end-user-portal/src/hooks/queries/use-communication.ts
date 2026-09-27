import {
	useQuery,
	useMutation,
	useQueryClient,
	type UseQueryResult,
	type UseMutationResult,
} from '@tanstack/react-query';
import {
	communicationLogs,
	communicationPushTokens,
	communicationPushTokensPost,
	communicationPushTokensByPushTokensDelete,
	communicationSmsPost,
	communicationEmailPost,
	communicationPushPost,
} from '@autional-cn/shared/generated/api';
import type { CommunicationLogItem, PushTokenItem } from './types';
import type { PaginatedList } from './types';
import { commQueryKeys } from './query-keys';

async function getCommunicationLogs(params?: {
	page?: number;
	pageSize?: number;
	channel?: string;
	status?: string;
}): Promise<PaginatedList<CommunicationLogItem>> {
	return communicationLogs(params) as Promise<PaginatedList<CommunicationLogItem>>;
}

async function getCommunicationPushTokens(params?: {
	page?: number;
	pageSize?: number;
	platform?: string;
}): Promise<PaginatedList<PushTokenItem>> {
	return communicationPushTokens(params) as Promise<PaginatedList<PushTokenItem>>;
}

async function postCommunicationPushToken(data: {
	token: string;
	platform: string;
	deviceId?: string;
	userId: string;
}): Promise<PushTokenItem> {
	return communicationPushTokensPost(data) as Promise<PushTokenItem>;
}

async function deleteCommunicationPushToken(id: string): Promise<void> {
	await communicationPushTokensByPushTokensDelete(id);
}

async function sendCommunicationSms(data: {
	phone: string;
	content?: string;
	template?: string;
	variables?: Record<string, string>;
	userId?: string;
}): Promise<unknown> {
	return communicationSmsPost(data);
}

async function sendCommunicationEmail(data: {
	to: string[];
	subject: string;
	content?: string;
	cc?: string[];
	bcc?: string[];
	isHtml?: boolean;
	template?: string;
	variables?: Record<string, string>;
	userId?: string;
}): Promise<unknown> {
	return communicationEmailPost(data);
}

async function sendCommunicationPush(data: {
	userId: string;
	title: string;
	body: string;
	platform?: string;
	data?: Record<string, unknown>;
}): Promise<unknown> {
	return communicationPushPost(data);
}

export function useCommunicationLogs(params?: {
	page?: number;
	pageSize?: number;
	channel?: string;
	status?: string;
}): UseQueryResult<PaginatedList<CommunicationLogItem>, Error> {
	return useQuery<PaginatedList<CommunicationLogItem>, Error>({
		queryKey: [...commQueryKeys.logs, params],
		queryFn: () => getCommunicationLogs(params),
		retry: 1,
	});
}

export function useCommunicationPushTokens(params?: {
	page?: number;
	pageSize?: number;
	platform?: string;
}): UseQueryResult<PaginatedList<PushTokenItem>, Error> {
	return useQuery<PaginatedList<PushTokenItem>, Error>({
		queryKey: [...commQueryKeys.pushTokens, params],
		queryFn: () => getCommunicationPushTokens(params),
		retry: 1,
	});
}

export function useRegisterPushToken(): UseMutationResult<
	PushTokenItem,
	Error,
	{ token: string; platform: string; deviceId?: string; userId: string }
> {
	const qc = useQueryClient();
	return useMutation<
		PushTokenItem,
		Error,
		{ token: string; platform: string; deviceId?: string; userId: string }
	>({
		mutationFn: (data) => postCommunicationPushToken(data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: commQueryKeys.pushTokens });
		},
	});
}

export function useDeletePushToken(): UseMutationResult<void, Error, string> {
	const qc = useQueryClient();
	return useMutation<void, Error, string>({
		mutationFn: deleteCommunicationPushToken,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: commQueryKeys.pushTokens });
		},
	});
}

export function useSendSms(): UseMutationResult<
	unknown,
	Error,
	{
		phone: string;
		content?: string;
		template?: string;
		variables?: Record<string, string>;
		userId?: string;
	}
> {
	return useMutation<
		unknown,
		Error,
		{
			phone: string;
			content?: string;
			template?: string;
			variables?: Record<string, string>;
			userId?: string;
		}
	>({
		mutationFn: sendCommunicationSms,
	});
}

export function useSendEmail(): UseMutationResult<
	unknown,
	Error,
	{
		to: string[];
		subject: string;
		content?: string;
		cc?: string[];
		bcc?: string[];
		isHtml?: boolean;
		template?: string;
		variables?: Record<string, string>;
		userId?: string;
	}
> {
	return useMutation<
		unknown,
		Error,
		{
			to: string[];
			subject: string;
			content?: string;
			cc?: string[];
			bcc?: string[];
			isHtml?: boolean;
			template?: string;
			variables?: Record<string, string>;
			userId?: string;
		}
	>({
		mutationFn: sendCommunicationEmail,
	});
}

export function useSendPush(): UseMutationResult<
	unknown,
	Error,
	{ userId: string; title: string; body: string; platform?: string; data?: Record<string, unknown> }
> {
	return useMutation<
		unknown,
		Error,
		{
			userId: string;
			title: string;
			body: string;
			platform?: string;
			data?: Record<string, unknown>;
		}
	>({
		mutationFn: sendCommunicationPush,
	});
}
