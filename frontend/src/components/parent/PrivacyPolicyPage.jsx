// Contopia — PrivacyPolicyPage
// Full privacy policy page with i18n support, API data fetching, and graceful fallback
// WCAG AA: text-slate-700 on bg-white (8.7:1), headings text-slate-800 (10.5:1)
// Semantic HTML: sections with aria-labelledby
// Language toggle: PT | EN switches locale via i18next changeLanguage()
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { HiClipboardList, HiShieldExclamation, HiClock, HiUserGroup, HiShieldCheck } from 'react-icons/hi';
import { Spinner } from 'flowbite-react';
import usePrivacyPolicy from '../../hooks/usePrivacyPolicy';
import PrivacyPolicySection from './PrivacyPolicySection';
import PrivacyNeverBadge from './PrivacyNeverBadge';
import PrivacyRightsCard from './PrivacyRightsCard';
import PrivacyComplianceBox from './PrivacyComplianceBox';

export default function PrivacyPolicyPage() {
  const { t, i18n } = useTranslation('privacy');
  const { data, isLoading, error } = usePrivacyPolicy();

  const currentLang = i18n.language?.startsWith('en') ? 'en' : 'pt-BR';

  const handleLanguageToggle = useCallback(() => {
    const newLang = currentLang === 'pt-BR' ? 'en' : 'pt-BR';
    i18n.changeLanguage(newLang);
  }, [i18n, currentLang]);

  // Helper: pick bilingual field based on current locale
  const pick = (field, fieldEn) => {
    if (currentLang === 'en' && fieldEn) return fieldEn;
    return field;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner aria-label="Loading privacy policy" size="xl" />
      </div>
    );
  }

  // Determine data source: API response or fallback to i18n
  const apiData = data?.data;
  const apiSections = apiData?.content?.sections;
  const apiCompliance = apiData?.content?.compliance;
  const supportEmail = apiData?.supportEmail || 'privacy@estantedigital.app';
  const childName = apiData?.content?.childFirstName || 'Julia';

  // Language toggle button
  const LanguageToggle = (
    <button
      onClick={handleLanguageToggle}
      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
      aria-label={`Switch to ${currentLang === 'pt-BR' ? 'English' : 'Português'}`}
      type="button"
    >
      PT | EN
      <span className="sr-only">
        {currentLang === 'pt-BR' ? 'Currently in Portuguese' : 'Currently in English'}
      </span>
    </button>
  );

  // API data available — render from API with locale-aware field picking
  if (apiSections && !error) {
    const sectionMap = {};
    apiSections.forEach((s) => { sectionMap[s.id] = s; });

    const whatWeCollect = sectionMap['what-we-collect'];
    const whatWeNeverDo = sectionMap['what-we-never-do'];
    const howLongWeKeep = sectionMap['how-long-we-keep'];
    const yourRights = sectionMap['your-rights'];

    return (
      <article className="space-y-8">
        <div className="flex items-center justify-between">
          <h1
            id="privacy-page-heading"
            className="text-2xl font-bold text-slate-800"
          >
            {t('pageTitle')}
          </h1>
          {LanguageToggle}
        </div>

        {whatWeCollect && (
          <PrivacyPolicySection
            icon={HiClipboardList}
            title={pick(whatWeCollect.title, whatWeCollect.titleEn)}
          >
            <p>{pick(whatWeCollect.description, whatWeCollect.descriptionEn)}</p>
          </PrivacyPolicySection>
        )}

        {whatWeNeverDo && (
          <PrivacyPolicySection
            icon={HiShieldExclamation}
            title={pick(whatWeNeverDo.title, whatWeNeverDo.titleEn)}
          >
            <PrivacyNeverBadge
              items={(whatWeNeverDo.items || []).map((item) =>
                pick(item.text, item.textEn)
              )}
            />
          </PrivacyPolicySection>
        )}

        {howLongWeKeep && (
          <PrivacyPolicySection
            icon={HiClock}
            title={pick(howLongWeKeep.title, howLongWeKeep.titleEn)}
          >
            <p>{pick(howLongWeKeep.description, howLongWeKeep.descriptionEn)}</p>
          </PrivacyPolicySection>
        )}

        {yourRights && (
          <PrivacyPolicySection
            icon={HiUserGroup}
            title={pick(yourRights.title, yourRights.titleEn)}
          >
            <PrivacyRightsCard
              items={(yourRights.items || []).map((item) =>
                pick(item.text, item.textEn)
              )}
              actions={(yourRights.actions || []).map((action) => ({
                label: pick(action.label, action.labelEn),
                path: action.path,
              }))}
              supportEmail={supportEmail}
              questionsLabel={t('sections.questions.title')}
            />
          </PrivacyPolicySection>
        )}

        {apiCompliance && apiCompliance.length > 0 && (
          <PrivacyPolicySection
            icon={HiShieldCheck}
            title={t('sections.compliance.title')}
          >
            <PrivacyComplianceBox
              compliance={apiCompliance.map((c) => ({
                id: c.id,
                title: c.title,
                description: pick(c.description, c.descriptionEn),
              }))}
            />
          </PrivacyPolicySection>
        )}

        {/* Questions section */}
        <PrivacyPolicySection icon={HiClipboardList} title={t('sections.questions.title')}>
          <p className="text-slate-700">
            {t('sections.questions.description')}{' '}
            <a
              href={`mailto:${supportEmail}`}
              className="text-blue-600 hover:text-blue-700 underline underline-offset-2"
              rel="noopener noreferrer"
            >
              {supportEmail}
            </a>
          </p>
        </PrivacyPolicySection>
      </article>
    );
  }

  // Fallback: render from i18n locale files (no API or API error)
  const neverItems = t('sections.whatWeNeverDo.items', { returnObjects: true, defaultValue: [] });
  const rightsItems = t('sections.yourRights.items', { returnObjects: true, defaultValue: [] });

  return (
    <article className="space-y-8">
      <div className="flex items-center justify-between">
        <h1
          id="privacy-page-heading"
          className="text-2xl font-bold text-slate-800"
        >
          {t('pageTitle')}
        </h1>
        {LanguageToggle}
      </div>

      {/* What we collect */}
      <PrivacyPolicySection
        icon={HiClipboardList}
        title={t('sections.whatWeCollect.title')}
      >
        <p>{t('sections.whatWeCollect.description', { childName })}</p>
      </PrivacyPolicySection>

      {/* What we NEVER do */}
      <PrivacyPolicySection
        icon={HiShieldExclamation}
        title={t('sections.whatWeNeverDo.title')}
      >
        <PrivacyNeverBadge
          items={Array.isArray(neverItems) ? neverItems.map((item) =>
            typeof item === 'string'
              ? t(item, { childName }, item)
              : item
          ) : []}
        />
      </PrivacyPolicySection>

      {/* How long we keep data */}
      <PrivacyPolicySection
        icon={HiClock}
        title={t('sections.howLongWeKeep.title')}
      >
        <p>{t('sections.howLongWeKeep.description')}</p>
      </PrivacyPolicySection>

      {/* Your rights */}
      <PrivacyPolicySection
        icon={HiUserGroup}
        title={t('sections.yourRights.title')}
      >
        <PrivacyRightsCard
          items={Array.isArray(rightsItems) ? rightsItems : []}
          actions={[
            {
              label: t('sections.yourRights.actions.export'),
              path: '/parent/dashboard/export',
            },
            {
              label: t('sections.yourRights.actions.delete'),
              path: '/parent/dashboard/delete',
            },
          ]}
          supportEmail={supportEmail}
          questionsLabel={t('sections.questions.title')}
        />
      </PrivacyPolicySection>

      {/* Compliance */}
      <PrivacyPolicySection
        icon={HiShieldCheck}
        title={t('sections.compliance.title')}
      >
        <PrivacyComplianceBox
          compliance={[
            {
              id: 'coppa',
              title: 'COPPA',
              description: t('sections.compliance.coppa'),
            },
            {
              id: 'gdpr-lgpd',
              title: 'GDPR / LGPD',
              description: t('sections.compliance.gdprLgpd'),
            },
          ]}
        />
      </PrivacyPolicySection>

      {/* Questions */}
      <PrivacyPolicySection icon={HiClipboardList} title={t('sections.questions.title')}>
        <p className="text-slate-700">
          {t('sections.questions.description')}{' '}
          <a
            href={`mailto:${supportEmail}`}
            className="text-blue-600 hover:text-blue-700 underline underline-offset-2"
            rel="noopener noreferrer"
          >
            {supportEmail}
          </a>
        </p>
      </PrivacyPolicySection>
    </article>
  );
}