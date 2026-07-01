import i18next from 'i18next';
import { getLanguage } from 'obsidian';
import locales from 'glob:./locales/*.json';

export async function initializeI18n() {
    return await i18next.init({
        lng: getLanguage(),
        fallbackLng: 'en',
        resources: Object.fromEntries(Object.entries(locales).map(([k, v]) => [k, {translation: v}])),
        interpolation: { escapeValue: false },
    });
};
