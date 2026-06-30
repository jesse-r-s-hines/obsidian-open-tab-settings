import i18next from 'i18next';
import { getLanguage } from 'obsidian';

// esbuild doesn't have an easy way to include all files in a dir, so we'll list them manually
import en from './locales/en.json';
const locales = {
    en,
}

export async function initializeI18n() {
    return await i18next.init({
        lng: getLanguage(),
        fallbackLng: 'en',
        resources: Object.fromEntries(Object.entries(locales).map(([k, v]) => [k, {translation: v}])),
        interpolation: { escapeValue: false },
    });
};
