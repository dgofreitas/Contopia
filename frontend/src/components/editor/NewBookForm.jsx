import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRef, useEffect } from 'react';
import { Label, TextInput, Textarea, Button, Alert, Spinner } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const newBookSchema = z.object({
  title: z.string().min(1, { message: 'errorTitleRequired' }).max(120, { message: 'errorTitleTooLong' }).trim(),
  summary: z.string().max(500, { message: 'errorSummaryTooLong' }).trim().optional().default(''),
});

export default function NewBookForm({ onSubmit, isPending, serverError }) {
  const { t } = useTranslation('editor');
  const navigate = useNavigate();
  const titleRef = useRef(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(newBookSchema),
    defaultValues: { title: '', summary: '' },
  });

  const titleValue = watch('title') || '';
  const summaryValue = watch('summary') || '';

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const titleCount = titleValue.length;
  const summaryCount = summaryValue.length;

  const getCharCountClass = (count, warnAt, max) => {
    if (count >= max) return 'text-red-500';
    if (count >= warnAt) return 'text-amber-500';
    return 'text-gray-400';
  };

  const getCharCountText = (count, max, warnAt) => {
    if (count >= max) return t('createBook.charCountOver', { count, max });
    if (count >= warnAt) return t('createBook.charCountWarn', { count, max });
    return t('createBook.charCount', { count, max });
  };

  const mapFieldError = (errorKey) => {
    if (!errorKey) return null;
    return t(`createBook.${errorKey.message || errorKey}`);
  };

  const titleError = errors.title ? t(`createBook.${errors.title.message}`) : null;
  const summaryError = errors.summary ? t(`createBook.${errors.summary.message}`) : null;

  const { ref: titleFieldRef, ...titleRegister } = register('title');
  const setTitleRef = (el) => {
    titleFieldRef(el);
    titleRef.current = el;
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      role="form"
      aria-label={t('createBook.formLabel')}
      className="flex flex-col gap-6 w-full max-w-md"
    >
      {serverError && (
        <Alert color="failure" role="alert" aria-live="polite">
          {serverError}
        </Alert>
      )}

      <div>
        <Label htmlFor="bookTitle" value={t('createBook.titleLabel')} className="mb-1 text-base font-medium text-gray-700" />
        <TextInput
          id="bookTitle"
          type="text"
          placeholder={t('createBook.titlePlaceholder')}
          {...titleRegister}
          ref={setTitleRef}
          color={titleError ? 'failure' : undefined}
          helperText={titleError}
          aria-describedby={titleError ? 'bookTitle-error bookTitle-count' : 'bookTitle-count'}
          aria-invalid={!!titleError}
          className="mt-1"
        />
        {titleError && (
          <span id="bookTitle-error" className="sr-only">{titleError}</span>
        )}
        <p id="bookTitle-count" className={`text-right text-sm mt-1 ${getCharCountClass(titleCount, 100, 120)}`} aria-live="polite">
          {getCharCountText(titleCount, 120, 100)}
        </p>
      </div>

      <div>
        <Label htmlFor="bookSummary" value={t('createBook.summaryLabel')} className="mb-1 text-base font-medium text-gray-700" />
        <Textarea
          id="bookSummary"
          rows={4}
          placeholder={t('createBook.summaryPlaceholder')}
          {...register('summary')}
          color={summaryError ? 'failure' : undefined}
          helperText={summaryError}
          aria-describedby={summaryError ? 'bookSummary-error bookSummary-count' : 'bookSummary-count'}
          aria-invalid={!!summaryError}
          className="mt-1"
        />
        {summaryError && (
          <span id="bookSummary-error" className="sr-only">{summaryError}</span>
        )}
        <p id="bookSummary-count" className={`text-right text-sm mt-1 ${getCharCountClass(summaryCount, 400, 500)}`} aria-live="polite">
          {getCharCountText(summaryCount, 500, 400)}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          type="submit"
          disabled={isPending}
          className="w-full bg-amber-500 hover:bg-amber-600 focus:ring-amber-300 text-white font-semibold text-lg py-2.5 rounded-xl transition-colors"
          size="xl"
          aria-label={t('createBook.startWriting')}
        >
          {isPending && <Spinner size="sm" className="mr-2" />}
          {t('createBook.startWriting')}
        </Button>

        <Button
          type="button"
          color="light"
          onClick={() => navigate('/shelf')}
          className="w-full border border-gray-200 text-gray-700 hover:bg-gray-50 focus:ring-gray-300 font-semibold text-lg py-2.5 rounded-xl transition-colors"
          size="xl"
          aria-label={t('createBook.cancel')}
        >
          {t('createBook.cancel')}
        </Button>
      </div>
    </form>
  );
}