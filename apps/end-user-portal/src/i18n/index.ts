import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import zhCN from './locales/zh-CN.json';
import enUS from './locales/en-US.json';

const resources = {
	'zh-CN': { translation: zhCN },
	'en-US': { translation: enUS },
};

// Unified flat-key format: all locale keys use dot-delimited paths (e.g. "nav.overview").
// keySeparator: false ensures dots in keys are treated as literal characters, not path separators.
i18n
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		resources,
		fallbackLng: 'zh-CN',
		supportedLngs: ['zh-CN', 'en-US'],
		keySeparator: false,
		interpolation: { escapeValue: false },
		detection: {
			order: ['localStorage', 'navigator'],
			caches: ['localStorage'],
			lookupLocalStorage: 'end-user-portal-lang',
		},
	});

export default i18n;
