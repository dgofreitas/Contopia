// Contopia — LoginForm Component
// Supports password and magic-link login methods via tabs
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Label, TextInput, Button, Alert, Spinner } from 'flowbite-react';
import { useTranslation } from 'react-i18next';

const passwordSchema = z.object({
  method: z.literal('password'),
  childId: z.string().min(1),
  password: z.string().min(4).max(20),
});

const magicLinkSchema = z.object({
  method: z.literal('magic-link'),
  parentEmail: z.string().email(),
  childFirstName: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[\p{L}]+$/u),
});

const loginSchema = z.discriminatedUnion('method', [passwordSchema, magicLinkSchema]);

export default function LoginForm({ onSubmit, isPending, serverError }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('password');
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { method: 'password' },
  });

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setMagicLinkSent(false);
    setValue('method', tab, { shouldValidate: false });
    reset({ method: tab });
  };

  const handleFormSubmit = (data) => {
    if (data.method === 'magic-link') {
      onSubmit(data);
      setMagicLinkSent(true);
    } else {
      onSubmit(data);
    }
  };

  const fieldErrors = {
    childId: errors.childId ? t('login.errorNotFound') : null,
    password: errors.password ? t('login.errorInvalidCredentials') : null,
    parentEmail: errors.parentEmail ? t('register.errorEmailInvalid') : null,
    childFirstName: errors.childFirstName ? t('register.errorNameInvalid') : null,
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-md">
      {/* Tab Buttons */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200" role="tablist" aria-label={t('login.title')}>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'password'}
          aria-controls="password-panel"
          id="password-tab"
          onClick={() => handleTabChange('password')}
          className={`flex-1 py-3 text-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-inset ${
            activeTab === 'password'
              ? 'bg-amber-500 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
          style={{ minHeight: '48px' }}
        >
          {t('login.passwordTab')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'magic-link'}
          aria-controls="magic-link-panel"
          id="magic-link-tab"
          onClick={() => handleTabChange('magic-link')}
          className={`flex-1 py-3 text-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-inset ${
            activeTab === 'magic-link'
              ? 'bg-amber-500 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
          style={{ minHeight: '48px' }}
        >
          {t('login.magicLinkTab')}
        </button>
      </div>

      {serverError && (
        <Alert color="failure" role="alert" aria-live="polite">
          {serverError}
        </Alert>
      )}

      {magicLinkSent && activeTab === 'magic-link' && !serverError && (
        <Alert color="success" role="status" aria-live="polite">
          {t('login.magicLinkSent')}
        </Alert>
      )}

      {/* Password Panel */}
      {activeTab === 'password' && (
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          noValidate
          role="tabpanel"
          id="password-panel"
          aria-labelledby="password-tab"
          className="flex flex-col gap-6"
          aria-label={t('login.passwordTab')}
        >
          <input type="hidden" {...register('method')} />

          <div>
            <Label htmlFor="childId" value={t('login.childId')} className="mb-1 text-base font-medium text-gray-700" />
            <TextInput
              id="childId"
              type="text"
              placeholder={t('login.childId')}
              {...register('childId')}
              color={fieldErrors.childId ? 'failure' : undefined}
              helperText={fieldErrors.childId}
              aria-describedby={fieldErrors.childId ? 'childId-error' : undefined}
              aria-invalid={!!fieldErrors.childId}
              className="mt-1"
              style={{ minHeight: '48px' }}
            />
            {fieldErrors.childId && (
              <span id="childId-error" className="sr-only">{fieldErrors.childId}</span>
            )}
          </div>

          <div>
            <Label htmlFor="loginPassword" value={t('login.password')} className="mb-1 text-base font-medium text-gray-700" />
            <TextInput
              id="loginPassword"
              type="password"
              placeholder={t('login.passwordPlaceholder')}
              {...register('password')}
              color={fieldErrors.password ? 'failure' : undefined}
              helperText={fieldErrors.password}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
              aria-invalid={!!fieldErrors.password}
              className="mt-1"
              style={{ minHeight: '48px' }}
            />
            {fieldErrors.password && (
              <span id="password-error" className="sr-only">{fieldErrors.password}</span>
            )}
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-amber-500 hover:bg-amber-600 focus:ring-amber-300 text-white font-semibold text-lg py-2.5 rounded-xl transition-colors"
            size="xl"
            aria-label={t('login.submit')}
            style={{ minHeight: '48px' }}
          >
            {isPending ? <Spinner size="sm" className="mr-2" /> : null}
            {t('login.submit')}
          </Button>
        </form>
      )}

      {/* Magic Link Panel */}
      {activeTab === 'magic-link' && (
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          noValidate
          role="tabpanel"
          id="magic-link-panel"
          aria-labelledby="magic-link-tab"
          className="flex flex-col gap-6"
          aria-label={t('login.magicLinkTab')}
        >
          <input type="hidden" {...register('method')} />

          <div>
            <Label htmlFor="mlParentEmail" value={t('login.parentEmail')} className="mb-1 text-base font-medium text-gray-700" />
            <TextInput
              id="mlParentEmail"
              type="email"
              placeholder={t('register.parentEmailPlaceholder')}
              {...register('parentEmail')}
              color={fieldErrors.parentEmail ? 'failure' : undefined}
              helperText={fieldErrors.parentEmail}
              aria-describedby={fieldErrors.parentEmail ? 'mlParentEmail-error' : undefined}
              aria-invalid={!!fieldErrors.parentEmail}
              className="mt-1"
              style={{ minHeight: '48px' }}
            />
            {fieldErrors.parentEmail && (
              <span id="mlParentEmail-error" className="sr-only">{fieldErrors.parentEmail}</span>
            )}
          </div>

          <div>
            <Label htmlFor="mlChildFirstName" value={t('login.childFirstName')} className="mb-1 text-base font-medium text-gray-700" />
            <TextInput
              id="mlChildFirstName"
              type="text"
              placeholder={t('register.childFirstNamePlaceholder')}
              {...register('childFirstName')}
              color={fieldErrors.childFirstName ? 'failure' : undefined}
              helperText={fieldErrors.childFirstName}
              aria-describedby={fieldErrors.childFirstName ? 'mlChildFirstName-error' : undefined}
              aria-invalid={!!fieldErrors.childFirstName}
              className="mt-1"
              style={{ minHeight: '48px' }}
            />
            {fieldErrors.childFirstName && (
              <span id="mlChildFirstName-error" className="sr-only">{fieldErrors.childFirstName}</span>
            )}
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-amber-500 hover:bg-amber-600 focus:ring-amber-300 text-white font-semibold text-lg py-2.5 rounded-xl transition-colors"
            size="xl"
            aria-label={t('login.sendMagicLink')}
            style={{ minHeight: '48px' }}
          >
            {isPending ? <Spinner size="sm" className="mr-2" /> : null}
            {t('login.sendMagicLink')}
          </Button>
        </form>
      )}
    </div>
  );
}