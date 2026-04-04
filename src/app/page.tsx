import type { Metadata } from 'next';
import {
	createSharedPreviewMetadata,
	sharedWidgetDescription,
	siteTitle,
} from '@/lib/shareMetadata';
import './landing/landing.css';

export const metadata: Metadata = {
	title: siteTitle,
	description: sharedWidgetDescription,
	alternates: {
		canonical: '/',
	},
	...createSharedPreviewMetadata('/'),
};

export { default } from './landing/page';
