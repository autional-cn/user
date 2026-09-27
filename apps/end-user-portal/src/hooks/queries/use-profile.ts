import {
	useQuery,
	useMutation,
	useQueryClient,
	type UseQueryResult,
	type UseMutationResult,
} from '@tanstack/react-query';
import { useAuth } from '@autional-cn/shared';
import {
	authMe,
	authMePut,
	authMePasswordPut,
	profilesAvatarUploadByProfilesPost,
	profilesPrivacyByProfiles,
	profilesPrivacyByProfilesPut,
	authSendVerificationEmailPost,
	authVerifyEmailPost,
} from '@autional-cn/shared/generated/api';
import type { UserProfile } from './types';
import { queryKeys } from './query-keys';

async function getUserProfile(): Promise<UserProfile> {
	return authMe() as Promise<UserProfile>;
}

async function updateUserProfile(data: Partial<UserProfile>): Promise<UserProfile> {
	return authMePut(data) as Promise<UserProfile>;
}

async function changePassword(data: {
	oldPassword: string;
	newPassword: string;
}): Promise<unknown> {
	return authMePasswordPut(data);
}

async function uploadAvatar(userId: string, file: File): Promise<{ avatarUrl?: string }> {
	const form = new FormData();
	form.append('file', file);
	const res = await (profilesAvatarUploadByProfilesPost as any)(userId, form, {
		// @generated-api-exempt (FormData)
		headers: { 'Content-Type': 'multipart/form-data' },
	});
	return res as { avatarUrl?: string };
}

export function useProfile(): UseQueryResult<UserProfile, Error> {
	return useQuery<UserProfile, Error>({
		queryKey: queryKeys.profile,
		queryFn: getUserProfile,
		retry: 1,
		staleTime: 5 * 60 * 1000,
	});
}

export function useUpdateProfile(): UseMutationResult<UserProfile, Error, Partial<UserProfile>> {
	const qc = useQueryClient();
	return useMutation<UserProfile, Error, Partial<UserProfile>>({
		mutationFn: updateUserProfile,
		onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.profile }),
	});
}

export function useChangePassword(): UseMutationResult<
	unknown,
	Error,
	{ oldPassword: string; newPassword: string }
> {
	return useMutation<unknown, Error, { oldPassword: string; newPassword: string }>({
		mutationFn: changePassword,
	});
}

export function useUploadAvatar(): UseMutationResult<
	{ avatarUrl?: string },
	Error,
	{ userId: string; file: File }
> {
	const qc = useQueryClient();
	return useMutation<{ avatarUrl?: string }, Error, { userId: string; file: File }>({
		mutationFn: ({ userId, file }) => uploadAvatar(userId, file),
		onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.profile }),
	});
}

interface PrivacySettings {
	showEmail: boolean;
	showPhone: boolean;
	profileVisibility: 'public' | 'private' | 'contacts_only';
}

async function getPrivacy(userId: string): Promise<PrivacySettings> {
	const data = (await profilesPrivacyByProfiles(userId)) as { data?: PrivacySettings };
	return data?.data || { showEmail: true, showPhone: false, profileVisibility: 'private' };
}

async function updatePrivacy(
	userId: string,
	settings: Partial<PrivacySettings>,
): Promise<PrivacySettings> {
	const res = (await profilesPrivacyByProfilesPut(userId, settings)) as { data?: PrivacySettings };
	return res?.data || ({} as PrivacySettings);
}

export function usePrivacy(): UseQueryResult<PrivacySettings, Error> {
	const { userId } = useAuth();
	return useQuery<PrivacySettings, Error>({
		queryKey: [...queryKeys.profile, 'privacy'] as const,
		queryFn: () => getPrivacy(userId || ''),
		enabled: !!userId,
		retry: 1,
	});
}

export function useUpdatePrivacy(): UseMutationResult<
	PrivacySettings,
	Error,
	Partial<PrivacySettings>
> {
	const qc = useQueryClient();
	const { userId } = useAuth();
	return useMutation<PrivacySettings, Error, Partial<PrivacySettings>>({
		mutationFn: (settings) => updatePrivacy(userId || '', settings),
		onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.profile, 'privacy'] }),
	});
}

async function sendVerificationEmail(email: string): Promise<unknown> {
	return authSendVerificationEmailPost({ email });
}

async function verifyEmailChange(token: string): Promise<unknown> {
	return authVerifyEmailPost({ token });
}

export function useSendVerificationEmail(): UseMutationResult<unknown, Error, string> {
	return useMutation<unknown, Error, string>({
		mutationFn: sendVerificationEmail,
	});
}

export function useVerifyEmailChange(): UseMutationResult<unknown, Error, string> {
	const qc = useQueryClient();
	return useMutation<unknown, Error, string>({
		mutationFn: verifyEmailChange,
		onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.profile }),
	});
}
