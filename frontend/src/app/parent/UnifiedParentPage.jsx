// Contopia — UnifiedParentPage
// STORY-062: Merged email-first authentication page at /parent
// States: idle → (loading) → login | register → success
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { m } from 'framer-motion';
import { Label, TextInput, Button, Alert, Checkbox, Spinner } from 'flowbite-react';
import { HiLockClosed, HiMail, HiCheckCircle } from 'react-icons/hi';
import { FaEnvelope, FaLock } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import useCheckEmail from '../../hooks/useCheckEmail';
import useParentAuthStore from '../../stores/parent-auth-store';
import axios from 'axios';

// --- Zod schema factories (accept `t` for i18n messages) ---
const createEmailSchema = (t) =>
  z.object({
    email: z.string().email(t('unifiedAuth.errorEmailInvalid')),
  });

const createLoginSchema = (t) =>
  z.object({
    password: z.string().min(1, t('unifiedAuth.errorRequired')),
  });

const createRegisterSchema = (t) =>
  z
    .object({
      password: z
        .string()
        .min(8, t('unifiedAuth.passwordRuleMinLength'))
        .regex(/[A-Z]/, t('unifiedAuth.passwordRuleUppercase'))
        .regex(/[0-9]/, t('unifiedAuth.passwordRuleNumber')),
      confirmPassword: z.string(),
      ageConsent: z.literal(true),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('unifiedAuth.errorPasswordMismatch'),
      path: ['confirmPassword'],
    });

export default function UnifiedParentPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Step state machine: idle | login | register
  const [step, setStep] = useState('idle');
  const [email, setEmail] = useState('');
  const [serverError, setServerError] = useState(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const passwordRef = useRef(null);

  const checkEmail = useCheckEmail();
  const setParentToken = useParentAuthStore((s) => s.setParentToken);
  const setParentRefreshToken = useParentAuthStore((s) => s.setParentRefreshToken);
  const setParentUser = useParentAuthStore((s) => s.setParentUser);
  const setParentSession = useParentAuthStore((s) => s.setParentSession);

  // --- react-hook-form instances ---
  const emailForm = useForm({
    resolver: zodResolver(createEmailSchema(t)),
    defaultValues: { email: '' },
  });

  const loginForm = useForm({
    resolver: zodResolver(createLoginSchema(t)),
    defaultValues: { password: '' },
  });

  const registerForm = useForm({
    resolver: zodResolver(createRegisterSchema(t)),
    defaultValues: { password: '', confirmPassword: '', ageConsent: false },
  });

  // Focus management: focus password field when mode changes
  useEffect(() => {
    if ((step === 'login' || step === 'register') && passwordRef.current) {
      passwordRef.current.focus();
    }
  }, [step]);

  // --- Handlers ---
  const handleEmailSubmit = (data) => {
    setServerError(null);
    setEmail(data.email);
    checkEmail.mutate(
      { email: data.email },
      {
        onSuccess: (result) => {
          setStep(result.exists ? 'login' : 'register');
        },
        onError: (error) => {
          const status = error?.response?.status;
          const code = error?.response?.data?.error?.code;
          if (status === 429 || code === 'RATE_LIMITED') {
            setServerError(t('unifiedAuth.errorRateLimited'));
          } else {
            setServerError(t('unifiedAuth.errorEmailCheckFailed'));
          }
        },
      },
    );
  };

  const handleLoginSubmit = async (data) => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const response = await axios.post('/api/parent/login', {
        email,
        password: data.password,
      });
      const result = response.data.data;
      setParentToken(result.accessToken);
      if (result.refreshToken) setParentRefreshToken(result.refreshToken);
      setParentUser({
        parentId: result.parentId,
        email: result.email,
        childId: result.childId,
        childFirstName: result.childFirstName,
      });
      setParentSession({
        parentSessionCreatedAt: Date.now(),
        parentLastActivity: Date.now(),
      });
      setIsSuccess(true);
      const returnTo = searchParams.get('returnTo') || '/parent/dashboard';
      setTimeout(() => navigate(returnTo, { replace: true }), 1500);
    } catch (err) {
      const code = err?.response?.data?.error?.code;
      if (code === 'INVALID_CREDENTIALS') {
        setServerError(t('unifiedAuth.loginErrorWrongPassword'));
      } else if (err?.response?.status === 429 || code === 'RATE_LIMITED') {
        setServerError(t('unifiedAuth.errorRateLimited'));
      } else {
        setServerError(t('unifiedAuth.errorGeneric'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (data) => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const response = await axios.post('/api/auth/register', {
        email,
        password: data.password,
        ageConsent: data.ageConsent,
      });
      const result = response.data.data;
      useParentAuthStore.getState().register({
        accessToken: result.accessToken,
        parentId: result.parentId,
        email: result.email,
        children: result.children,
      });
      setIsSuccess(true);
      const returnTo = searchParams.get('returnTo') || '/parent/dashboard';
      setTimeout(() => navigate(returnTo, { replace: true }), 1500);
    } catch (err) {
      const status = err?.response?.status;
      const code = err?.response?.data?.error?.code;
      if (status === 409 || code === 'ACCOUNT_EXISTS') {
        // Race condition: email was registered between check and submit
        setServerError(t('unifiedAuth.errorAccountExistsRace'));
        setStep('login');
      } else if (status === 429 || code === 'RATE_LIMITED') {
        setServerError(t('unifiedAuth.errorRateLimited'));
      } else {
        setServerError(t('unifiedAuth.errorGeneric'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep('idle');
    setEmail('');
    setServerError(null);
    setShowForgotPassword(false);
    emailForm.reset();
    loginForm.reset();
    registerForm.reset();
    checkEmail.reset();
  };

  // --- Render helpers ---
  const isCheckingEmail = checkEmail.isPending;

  // Password requirement indicators for register mode
  const watchPassword = registerForm.watch('password', '');
  const hasMinLength = watchPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(watchPassword);
  const hasNumber = /[0-9]/.test(watchPassword);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <HiLockClosed className="w-6 h-6 text-slate-600" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-semibold text-slate-800">
              {t('unifiedAuth.title')}
            </h1>
          </div>

          {/* Session expired alert */}
          {searchParams.get('expired') === 'true' && (
            <Alert color="info" role="status" aria-live="polite">
              {t('childSession.parentSessionExpired')}
            </Alert>
          )}

          {/* Success state */}
          {isSuccess ? (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <Alert
                color="success"
                icon={HiCheckCircle}
                className="rounded-xl"
                role="alert"
                aria-live="polite"
              >
                <span className="font-semibold">{t('register.registrationSuccess')}</span>
                <p className="mt-1 text-sm">{t('register.redirecting')}</p>
              </Alert>
            </m.div>
          ) : (
            <>
              {/* Server error */}
              {serverError && (
                <Alert color="failure" role="alert" aria-live="assertive">
                  {serverError}
                </Alert>
              )}

              {/* --- IDLE: Email form --- */}
              {step === 'idle' && (
                <form
                  onSubmit={emailForm.handleSubmit(handleEmailSubmit)}
                  noValidate
                  className="space-y-4"
                  aria-label={t('unifiedAuth.title')}
                >
                  <div className="relative">
                    <Label
                      htmlFor="unified-email"
                      value={t('unifiedAuth.emailLabel')}
                      className="mb-1 text-base font-medium text-slate-700"
                    />
                    <div className="relative">
                      <TextInput
                        id="unified-email"
                        type="email"
                        placeholder={t('unifiedAuth.emailPlaceholder')}
                        disabled={isCheckingEmail}
                        {...emailForm.register('email')}
                        color={emailForm.formState.errors.email ? 'failure' : undefined}
                        helperText={
                          emailForm.formState.errors.email
                            ? t('unifiedAuth.errorEmailInvalid')
                            : undefined
                        }
                        aria-describedby={
                          emailForm.formState.errors.email ? 'unified-email-error' : undefined
                        }
                        aria-invalid={!!emailForm.formState.errors.email}
                        className="mt-1 pl-10"
                        autoComplete="email"
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none z-10">
                        <FaEnvelope className="h-5 w-5 text-slate-400" aria-hidden="true" />
                      </div>
                    </div>
                    {emailForm.formState.errors.email && (
                      <span id="unified-email-error" className="sr-only">
                        {t('unifiedAuth.errorEmailInvalid')}
                      </span>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isCheckingEmail}
                    className="w-full bg-slate-700 hover:bg-slate-800 focus:ring-slate-300 text-white font-semibold text-lg py-2.5 rounded-xl transition-colors"
                    size="xl"
                  >
                    {isCheckingEmail ? (
                      <div className="flex items-center gap-2">
                        <Spinner size="sm" />
                        {t('unifiedAuth.checkingButton')}
                      </div>
                    ) : (
                      t('unifiedAuth.continueButton')
                    )}
                  </Button>
                </form>
              )}

              {/* --- LOGIN: Password form --- */}
              {step === 'login' && (
                <div>
                  {/* aria-live region for mode change announcement */}
                  <div aria-live="polite" className="sr-only">
                    {t('unifiedAuth.loginHeading')}
                  </div>

                  <div className="text-center mb-4">
                    <h2 className="text-xl font-semibold text-slate-800">
                      {t('unifiedAuth.loginHeading')}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {t('unifiedAuth.loginSubtitle')}
                    </p>
                  </div>

                  {/* Show the email (disabled) */}
                  <div className="mb-4">
                    <Label
                      htmlFor="login-email-display"
                      value={t('unifiedAuth.emailLabel')}
                      className="mb-1 text-base font-medium text-slate-700"
                    />
                    <div className="relative">
                      <TextInput
                        id="login-email-display"
                        type="email"
                        value={email}
                        disabled
                        className="mt-1 pl-10"
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none z-10">
                        <FaEnvelope className="h-5 w-5 text-slate-400" aria-hidden="true" />
                      </div>
                    </div>
                  </div>

                  <form
                    onSubmit={loginForm.handleSubmit(handleLoginSubmit)}
                    noValidate
                    className="space-y-4"
                    aria-label={t('unifiedAuth.loginHeading')}
                  >
                    <div>
                      <Label
                        htmlFor="login-password"
                        value={t('login.password')}
                        className="mb-1 text-base font-medium text-slate-700"
                      />
                      <div className="relative">
                        <TextInput
                          id="login-password"
                          type="password"
                          placeholder={t('login.passwordPlaceholder')}
                          disabled={isSubmitting}
                          {...loginForm.register('password')}
                          color={loginForm.formState.errors.password ? 'failure' : undefined}
                          helperText={
                            loginForm.formState.errors.password
                              ? loginForm.formState.errors.password.message
                              : undefined
                          }
                          aria-invalid={!!loginForm.formState.errors.password}
                          autoComplete="current-password"
                          className="mt-1 pl-10"
                          ref={(e) => {
                            loginForm.register('password').ref(e);
                            passwordRef.current = e;
                          }}
                        />
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none z-10">
                          <FaLock className="h-5 w-5 text-slate-400" aria-hidden="true" />
                        </div>
                      </div>
                    </div>

                    {/* Forgot password link */}
                    <div>
                      <button
                        type="button"
                        className="text-sm text-slate-500 hover:text-slate-700 underline transition-colors"
                        onClick={() => setShowForgotPassword(!showForgotPassword)}
                      >
                        {t('unifiedAuth.forgotPassword')}
                      </button>
                      {showForgotPassword && (
                        <p className="mt-2 text-sm text-slate-600" role="alert">
                          {t('unifiedAuth.forgotPasswordMessage')}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-slate-700 hover:bg-slate-800 focus:ring-slate-300 text-white font-semibold text-lg py-2.5 rounded-xl transition-colors"
                      size="xl"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <Spinner size="sm" />
                          {t('unifiedAuth.loginButton')}
                        </div>
                      ) : (
                        t('unifiedAuth.loginButton')
                      )}
                    </Button>
                  </form>

                  <div className="mt-4 text-center">
                    <button
                      type="button"
                      className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                      onClick={handleReset}
                    >
                      {t('unifiedAuth.notYouLink')}
                    </button>
                  </div>
                </div>
              )}

              {/* --- REGISTER: Password + confirm + ageConsent form --- */}
              {step === 'register' && (
                <div>
                  {/* aria-live region for mode change announcement */}
                  <div aria-live="polite" className="sr-only">
                    {t('unifiedAuth.registerHeading')}
                  </div>

                  <div className="text-center mb-4">
                    <h2 className="text-xl font-semibold text-slate-800">
                      {t('unifiedAuth.registerHeading')}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {t('unifiedAuth.registerSubtitle')}
                    </p>
                  </div>

                  {/* Show the email (disabled) */}
                  <div className="mb-4">
                    <Label
                      htmlFor="register-email-display"
                      value={t('unifiedAuth.emailLabel')}
                      className="mb-1 text-base font-medium text-slate-700"
                    />
                    <div className="relative">
                      <TextInput
                        id="register-email-display"
                        type="email"
                        value={email}
                        disabled
                        className="mt-1 pl-10"
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none z-10">
                        <FaEnvelope className="h-5 w-5 text-slate-400" aria-hidden="true" />
                      </div>
                    </div>
                  </div>

                  <form
                    onSubmit={registerForm.handleSubmit(handleRegisterSubmit)}
                    noValidate
                    className="space-y-4"
                    aria-label={t('unifiedAuth.registerHeading')}
                  >
                    <div>
                      <Label
                        htmlFor="register-password"
                        value={t('register.password')}
                        className="mb-1 text-base font-medium text-slate-700"
                      />
                      <div className="relative">
                        <TextInput
                          id="register-password"
                          type="password"
                          placeholder={t('register.passwordPlaceholder')}
                          disabled={isSubmitting}
                          {...registerForm.register('password')}
                          color={registerForm.formState.errors.password ? 'failure' : undefined}
                          helperText={
                            registerForm.formState.errors.password
                              ? registerForm.formState.errors.password.message
                              : undefined
                          }
                          aria-describedby="password-rules"
                          aria-invalid={!!registerForm.formState.errors.password}
                          autoComplete="new-password"
                          className="mt-1 pl-10"
                          ref={(e) => {
                            registerForm.register('password').ref(e);
                            passwordRef.current = e;
                          }}
                        />
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none z-10">
                          <FaLock className="h-5 w-5 text-slate-400" aria-hidden="true" />
                        </div>
                      </div>
                      <ul id="password-rules" className="mt-2 space-y-1" role="list">
                        <li
                          className={`text-sm flex items-center gap-1 ${hasMinLength ? 'text-green-600' : 'text-slate-400'}`}
                        >
                          <span aria-hidden="true">{hasMinLength ? '✓' : '○'}</span>{' '}
                          {t('unifiedAuth.passwordRuleMinLength')}
                        </li>
                        <li
                          className={`text-sm flex items-center gap-1 ${hasUppercase ? 'text-green-600' : 'text-slate-400'}`}
                        >
                          <span aria-hidden="true">{hasUppercase ? '✓' : '○'}</span>{' '}
                          {t('unifiedAuth.passwordRuleUppercase')}
                        </li>
                        <li
                          className={`text-sm flex items-center gap-1 ${hasNumber ? 'text-green-600' : 'text-slate-400'}`}
                        >
                          <span aria-hidden="true">{hasNumber ? '✓' : '○'}</span> {t('unifiedAuth.passwordRuleNumber')}
                        </li>
                      </ul>
                    </div>

                    <div>
                      <Label
                        htmlFor="register-confirm-password"
                        value={t('unifiedAuth.confirmPasswordLabel')}
                        className="mb-1 text-base font-medium text-slate-700"
                      />
                      <div className="relative">
                        <TextInput
                          id="register-confirm-password"
                          type="password"
                          placeholder={t('unifiedAuth.confirmPasswordPlaceholder')}
                          disabled={isSubmitting}
                          {...registerForm.register('confirmPassword')}
                          color={registerForm.formState.errors.confirmPassword ? 'failure' : undefined}
                          helperText={
                            registerForm.formState.errors.confirmPassword
                              ? registerForm.formState.errors.confirmPassword.message
                              : undefined
                          }
                          aria-invalid={!!registerForm.formState.errors.confirmPassword}
                          autoComplete="new-password"
                          className="mt-1 pl-10"
                        />
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none z-10">
                          <FaLock className="h-5 w-5 text-slate-400" aria-hidden="true" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-start gap-2">
                        <Checkbox
                          id="register-age-consent"
                          {...registerForm.register('ageConsent')}
                          className="mt-1"
                          aria-describedby={
                            registerForm.formState.errors.ageConsent
                              ? 'ageConsent-error'
                              : undefined
                          }
                          aria-invalid={!!registerForm.formState.errors.ageConsent}
                        />
                        <Label
                          htmlFor="register-age-consent"
                          className="text-sm text-slate-600"
                        >
                          {t('register.ageConsentLabel')}
                        </Label>
                      </div>
                      {registerForm.formState.errors.ageConsent && (
                        <>
                          <p className="mt-1 text-sm text-red-500" role="alert">
                            {t('register.errorAgeConsent')}
                          </p>
                          <span id="ageConsent-error" className="sr-only">
                            {t('register.errorAgeConsent')}
                          </span>
                        </>
                      )}
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-slate-700 hover:bg-slate-800 focus:ring-slate-300 text-white font-semibold text-lg py-2.5 rounded-xl transition-colors"
                      size="xl"
                      aria-label={t('unifiedAuth.registerButton')}
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <Spinner size="sm" />
                          {t('unifiedAuth.registerButton')}
                        </div>
                      ) : (
                        t('unifiedAuth.registerButton')
                      )}
                    </Button>
                  </form>

                  <div className="mt-4 text-center">
                    <button
                      type="button"
                      className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                      onClick={handleReset}
                    >
                      {t('unifiedAuth.alreadyHaveAccount')}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-4 text-center">
          <Link
            to="/login"
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            ← {t('login.title')} (child)
          </Link>
        </div>

        <p className="mt-6 text-center text-sm text-slate-400">
           {t('unifiedAuth.coppaNotice')}
        </p>
      </m.div>
    </main>
  );
}