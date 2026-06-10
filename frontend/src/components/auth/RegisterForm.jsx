// Contopia — RegisterForm Component
// STORY-057: Direct parent registration (email + password + ageConsent)
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Label, TextInput, Button, Alert, Spinner, Checkbox } from 'flowbite-react';
import { HiMail, HiLockClosed } from 'react-icons/hi';
import { useTranslation } from 'react-i18next';

const registerSchema = z
  .object({
    email: z.string().email(),
    password: z
      .string()
      .min(8)
      .regex(/[A-Z]/, 'Must contain at least 1 uppercase letter')
      .regex(/[0-9]/, 'Must contain at least 1 number'),
    ageConsent: z.literal(true),
  })
  .required();

export default function RegisterForm({ onSubmit, isPending, serverError }) {
  const { t } = useTranslation('auth');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { ageConsent: false },
  });

  const passwordValue = watch('password', '');

  const fieldErrors = {
    email: errors.email ? t('register.errorEmailInvalid') : null,
    password: errors.password ? errors.password.message || t('register.errorPasswordInvalid') : null,
    ageConsent: errors.ageConsent ? t('register.errorAgeConsent') : null,
  };

  // Password requirement indicators
  const hasMinLength = passwordValue.length >= 8;
  const hasUppercase = /[A-Z]/.test(passwordValue);
  const hasNumber = /[0-9]/.test(passwordValue);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-6 w-full max-w-md"
      aria-label={t('register.title')}
    >
      {serverError && (
        <Alert color="failure" role="alert" aria-live="polite">
          {serverError}
        </Alert>
      )}

      <div>
        <Label htmlFor="email" value={t('register.email')} className="mb-1 text-base font-medium text-slate-700" />
        <TextInput
          id="email"
          type="email"
          placeholder={t('register.emailPlaceholder')}
          icon={HiMail}
          {...register('email')}
          color={fieldErrors.email ? 'failure' : undefined}
          helperText={fieldErrors.email}
          aria-describedby={fieldErrors.email ? 'email-error' : undefined}
          aria-invalid={!!fieldErrors.email}
          className="mt-1"
        />
        {fieldErrors.email && (
          <span id="email-error" className="sr-only">{fieldErrors.email}</span>
        )}
      </div>

      <div>
        <Label htmlFor="password" value={t('register.password')} className="mb-1 text-base font-medium text-slate-700" />
        <TextInput
          id="password"
          type="password"
          placeholder={t('register.passwordPlaceholder')}
          icon={HiLockClosed}
          {...register('password')}
          color={fieldErrors.password ? 'failure' : undefined}
          helperText={fieldErrors.password}
          aria-describedby="password-rules"
          aria-invalid={!!fieldErrors.password}
          autoComplete="new-password"
          className="mt-1"
        />
        <ul id="password-rules" className="mt-2 space-y-1" role="list">
          <li className={`text-sm flex items-center gap-1 ${hasMinLength ? 'text-green-600' : 'text-slate-400'}`}>
            <span aria-hidden="true">{hasMinLength ? '✓' : '○'}</span> At least 8 characters
          </li>
          <li className={`text-sm flex items-center gap-1 ${hasUppercase ? 'text-green-600' : 'text-slate-400'}`}>
            <span aria-hidden="true">{hasUppercase ? '✓' : '○'}</span> At least 1 uppercase letter
          </li>
          <li className={`text-sm flex items-center gap-1 ${hasNumber ? 'text-green-600' : 'text-slate-400'}`}>
            <span aria-hidden="true">{hasNumber ? '✓' : '○'}</span> At least 1 number
          </li>
        </ul>
      </div>

      <div>
        <Checkbox
          id="ageConsent"
          {...register('ageConsent')}
          className="mt-1"
          aria-describedby={fieldErrors.ageConsent ? 'ageConsent-error' : undefined}
          aria-invalid={!!fieldErrors.ageConsent}
        />
        <Label htmlFor="ageConsent" className="ml-2 text-sm text-slate-600">
          {t('register.ageConsentLabel')}
        </Label>
        {fieldErrors.ageConsent && (
          <>
            <p className="mt-1 text-sm text-red-500">{fieldErrors.ageConsent}</p>
            <span id="ageConsent-error" className="sr-only">{fieldErrors.ageConsent}</span>
          </>
        )}
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full bg-slate-700 hover:bg-slate-800 focus:ring-slate-300 text-white font-semibold text-lg py-2.5 rounded-xl transition-colors"
        size="xl"
        aria-label={t('register.submit')}
      >
        {isPending ? <Spinner size="sm" className="mr-2" /> : null}
        {t('register.submit')}
      </Button>
    </form>
  );
}