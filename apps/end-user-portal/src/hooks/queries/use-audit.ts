import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { authMeAuditLogs } from '@autional-cn/shared/generated/api';
import type { AuditLogItem } from './types';
import type { PageInfo } from './types';
import { queryKeys } from './query-keys';

async function getAuditLogs(params?: {
	page?: number;
	pageSize?: number;
	startDate?: string;
	endDate?: string;
	action?: string;
	status?: string;
}): Promise<{ items?: AuditLogItem[]; total?: number; pagination?: PageInfo }> {
	return authMeAuditLogs(params) as Promise<{
		items?: AuditLogItem[];
		total?: number;
		pagination?: PageInfo;
	}>;
}

export function useAuditLogs(params?: {
	page?: number;
	pageSize?: number;
	startDate?: string;
	endDate?: string;
	action?: string;
	status?: string;
}): UseQueryResult<{ items?: AuditLogItem[]; total?: number; pagination?: PageInfo }, Error> {
	return useQuery<{ items?: AuditLogItem[]; total?: number; pagination?: PageInfo }, Error>({
		queryKey: queryKeys.auditLogs(params),
		queryFn: () => getAuditLogs(params),
		retry: 1,
	});
}
