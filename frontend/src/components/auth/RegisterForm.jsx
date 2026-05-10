// Contopia — RegisterForm Component
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Label } from 'flowbite-react';
import { TextInput } from 'flowbite-react';
import { Button } from 'flowbite-react';
import { Alert } from 'flowbite-react';
import { Spinner } from 'flowbite-react';
import { useTranslation } from 'react-i18next';

const registerSchema = z.object({
  parentEmail: z.string().email(),
  childFirstName: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[\p{L}]+$/u),
});

export default function RegisterForm({ onSubmit, isPending, serverError }) {
  const { t } = useTranslation('auth');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const fieldErrors = {
    parentEmail: errors.parentEmail ? t('register.errorEmailInvalid') : null,
    childFirstName: errors.childFirstName ? t('register.errorNameInvalid') : null,
  };

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
        <Label htmlFor="parentEmail" value={t('register.parentEmail')} className="mb-1 text-base font-medium text-gray-700" />
        <TextInput
          id="parentEmail"
          type="email"
          placeholder={t('register.parentEmailPlaceholder')}
          {...register('parentEmail')}
          color={fieldErrors.parentEmail ? 'failure' : undefined}
          helperText={fieldErrors.parentEmail}
          aria-describedby={fieldErrors.parentEmail ? 'parentEmail-error' : undefined}
          aria-invalid={!!fieldErrors.parentEmail}
          className="mt-1"
        />
        {fieldErrors.parentEmail && (
          <span id="parentEmail-error" className="sr-only">{fieldErrors.parentEmail}</span>
        )}
      </div>

      <div>
        <Label htmlFor="childFirstName" value={t('register.childFirstName')} className="mb-1 text-base font-medium text-gray-700" />
        <TextInput
          id="childFirstName"
          type="text"
          placeholder={t('register.childFirstNamePlaceholder')}
          {...register('childFirstName')}
          color={fieldErrors.childFirstName ? 'failure' : undefined}
          helperText={fieldErrors.childFirstName}
          aria-describedby={fieldErrors.childFirstName ? 'childFirstName-error' : undefined}
          aria-invalid={!!fieldErrors.childFirstName}
          className="mt-1"
        />
        {fieldErrors.childFirstName && (
          <span id="childFirstName-error" className="sr-only">{fieldErrors.childFirstName}</span>
        )}
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full bg-amber-500 hover:bg-amber-600 focus:ring-amber-300 text-white font-semibold text-lg py-2.5 rounded-xl transition-colors"
        size="xl"
        aria-label={t('register.submit')}
      >
        {isPending ? <Spinner size="sm" className="mr-2" /> : null}
        {t('register.submit')}
      </Button>
    </form>
  );
}