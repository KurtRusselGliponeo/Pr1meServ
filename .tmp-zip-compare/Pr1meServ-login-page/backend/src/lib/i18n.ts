import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import path from 'path';

/**
 * Initialize i18next for backend string extraction and translation.
 * Extracts messages like error responses, emails, and system notifications.
 */
export async function initI18n() {
  await i18next.use(Backend).init({
    fallbackLng: 'en',
    preload: ['en', 'tl'],
    ns: ['errors', 'emails', 'notifications'],
    defaultNS: 'errors',
    backend: {
      loadPath: path.join(__dirname, '../locales/{{lng}}/{{ns}}.json'),
    },
    // We don't need react specific stuff in backend
    initImmediate: false,
  });

  return i18next;
}

export const t = i18next.t.bind(i18next);
export default i18next;
