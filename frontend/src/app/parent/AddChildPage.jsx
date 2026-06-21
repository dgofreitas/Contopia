// Contopia — AddChildPage
// STORY-062: Form for parent to add a dependent (child profile)
// Fields: firstName (required), dateOfBirth (optional), avatarSeed (optional)
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Label, TextInput, Button, Alert, Spinner } from 'flowbite-react';
import { HiPlus, HiArrowLeft } from 'react-icons/hi';
import { useTranslation } from 'react-i18next';
import useAddChild from '../../hooks/useAddChild';

const NAME_REGEX = /^[A-Za-zÀ-ÿ\s'-]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const AVATAR_OPTIONS = [
  { seed: 'fox', emoji: '🦊', labelKey: 'addChild.avatarFox' },
  { seed: 'bear', emoji: '🐻', labelKey: 'addChild.avatarBear' },
  { seed: 'owl', emoji: '🦉', labelKey: 'addChild.avatarOwl' },
  { seed: 'rabbit', emoji: '🐰', labelKey: 'addChild.avatarRabbit' },
  { seed: 'panda', emoji: '🐼', labelKey: 'addChild.avatarPanda' },
  { seed: 'lion', emoji: '🦁', labelKey: 'addChild.avatarLion' },
  { seed: 'frog', emoji: '🐸', labelKey: 'addChild.avatarFrog' },
  { seed: 'cat', emoji: '🐱', labelKey: 'addChild.avatarCat' },
];

const createAddChildSchema = (t) =>
  z.object({
    firstName: z
      .string({ required_error: t('addChild.errorNameRequired') })
      .trim()
      .min(1, t('addChild.errorNameRequired'))
      .max(40, t('addChild.errorNameTooLong'))
      .regex(NAME_REGEX, t('addChild.errorNameInvalid')),
    dateOfBirth: z
      .string()
      .regex(DATE_REGEX, t('addChild.errorDateInvalid'))
      .optional()
      .or(z.literal('')),
    avatarSeed: z.string().max(30).optional().or(z.literal('')),
  });

export default function AddChildPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const addChild = useAddChild();
  const [serverError, setServerError] = useState(null);
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const nameInputRef = useRef(null);

  const form = useForm({
    resolver: zodResolver(createAddChildSchema(t)),
    defaultValues: { firstName: '', dateOfBirth: '', avatarSeed: '' },
  });

  // Register the firstName field once and merge our focus ref with RHF's ref
  // so that validation reads the DOM value AND we can focus on mount.
  const firstNameRegister = form.register('firstName');

  // Focus the name field on mount
  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, []);

  const onSubmit = (data) => {
    setServerError(null);
    const payload = {
      firstName: data.firstName,
      dateOfBirth: data.dateOfBirth || undefined,
      avatarSeed: data.avatarSeed || selectedAvatar || undefined,
    };
    addChild.mutate(payload, {
      onSuccess: () => {
        navigate('/parent/dashboard');
      },
      onError: (error) => {
        const code = error?.response?.data?.error?.code;
        if (code === 'CHILD_LIMIT_REACHED') {
          setServerError(t('addChild.errorChildLimit'));
        } else if (code === 'ACCOUNT_EXISTS') {
          setServerError(t('addChild.errorDuplicateName'));
        } else {
          setServerError(t('addChild.errorGeneric'));
        }
      },
    });
  };

  const selectedAvatarOption = AVATAR_OPTIONS.find((opt) => opt.seed === selectedAvatar);

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header with back button */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/parent/dashboard')}
          className="text-slate-600 hover:text-slate-800 p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
          aria-label={t('addChild.backToDashboard')}
        >
          <HiArrowLeft className="w-5 h-5" aria-hidden="true" />
        </button>
        <h1 className="text-lg font-semibold text-slate-800">
          {t('addChild.title')}
        </h1>
      </header>

      <div className="flex-1 flex items-start sm:items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-slate-200 p-6 sm:p-8 space-y-6">
          {/* Server error */}
          {serverError && (
            <Alert color="failure" role="alert" aria-live="assertive" data-testid="server-error">
              {serverError}
            </Alert>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4" aria-label={t('addChild.title')}>
            {/* First name (required) */}
            <div>
              <Label
                htmlFor="child-first-name"
                value={t('addChild.nameLabel')}
                className="mb-1 text-base font-medium text-slate-700"
              />
              <TextInput
                id="child-first-name"
                type="text"
                placeholder={t('addChild.namePlaceholder')}
                disabled={addChild.isPending}
                {...firstNameRegister}
                color={form.formState.errors.firstName ? 'failure' : undefined}
                helperText={form.formState.errors.firstName?.message}
                aria-describedby={form.formState.errors.firstName ? 'child-first-name-error' : undefined}
                aria-invalid={!!form.formState.errors.firstName}
                ref={(el) => {
                  // Wire RHF's ref so it can read the DOM value for validation,
                  // and our local ref so we can focus on mount.
                  firstNameRegister.ref(el);
                  nameInputRef.current = el;
                }}
                autoComplete="given-name"
              />
              {form.formState.errors.firstName && (
                <span id="child-first-name-error" className="sr-only" role="alert" aria-live="assertive">
                  {form.formState.errors.firstName.message}
                </span>
              )}
            </div>

            {/* Date of birth (optional) */}
            <div>
              <Label
                htmlFor="child-dob"
                value={t('addChild.dateOfBirthLabel')}
                className="mb-1 text-base font-medium text-slate-700"
              />
              <TextInput
                id="child-dob"
                type="date"
                disabled={addChild.isPending}
                {...form.register('dateOfBirth')}
                color={form.formState.errors.dateOfBirth ? 'failure' : undefined}
                helperText={form.formState.errors.dateOfBirth?.message}
                aria-invalid={!!form.formState.errors.dateOfBirth}
                max={new Date().toISOString().slice(0, 10)}
              />
              {form.formState.errors.dateOfBirth && (
                <span id="child-dob-error" className="sr-only" role="alert" aria-live="assertive">
                  {form.formState.errors.dateOfBirth.message}
                </span>
              )}
            </div>

            {/* Avatar (optional) — simple emoji grid with live preview */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label
                  htmlFor="child-avatar"
                  value={t('addChild.avatarLabel')}
                  className="text-base font-medium text-slate-700"
                />
                {selectedAvatarOption && (
                  <span
                    className="text-2xl"
                    role="img"
                    aria-label={t('addChild.avatarPreview', { seed: t(selectedAvatarOption.labelKey) })}
                    data-testid="avatar-preview"
                  >
                    {selectedAvatarOption.emoji}
                  </span>
                )}
              </div>
              <div
                id="child-avatar"
                role="radiogroup"
                aria-label={t('addChild.avatarLabel')}
                className="grid grid-cols-4 gap-2"
              >
                {AVATAR_OPTIONS.map((opt) => {
                  const isSelected = selectedAvatar === opt.seed;
                  return (
                    <button
                      key={opt.seed}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setSelectedAvatar(isSelected ? '' : opt.seed)}
                      disabled={addChild.isPending}
                      className={`flex items-center justify-center h-12 rounded-lg border-2 text-2xl transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                        isSelected
                          ? 'border-amber-500 bg-amber-100 text-amber-900'
                          : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50 bg-white text-slate-700'
                      }`}
                      aria-label={t(opt.labelKey)}
                    >
                      <span aria-hidden="true">{opt.emoji}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={addChild.isPending}
              className="w-full bg-amber-500 hover:bg-amber-600 focus:ring-amber-300 text-white font-semibold text-lg py-2.5 rounded-xl transition-colors"
              size="xl"
            >
              {addChild.isPending ? (
                <div className="flex items-center gap-2">
                  <Spinner size="sm" />
                  {t('addChild.submitting')}
                </div>
              ) : (
                <span className="flex items-center gap-2">
                  <HiPlus className="h-5 w-5" aria-hidden="true" />
                  {t('addChild.submit')}
                </span>
              )}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}