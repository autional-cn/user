import type { Meta, StoryObj } from '@storybook/react';
import { SkeletonCard, SkeletonRow } from './Skeleton';

const meta: Meta = {
	title: 'UI/Skeleton',
	component: SkeletonCard,
};

export default meta;

export const Card: StoryObj = {
	render: () => <SkeletonCard />,
};

export const Row: StoryObj = {
	render: () => <SkeletonRow />,
};
