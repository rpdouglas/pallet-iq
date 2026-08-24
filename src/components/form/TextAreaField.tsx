import { forwardRef, useId, type TextareaHTMLAttributes } from 'react'

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
}

// PALLETIQ-030 / ADR-0014. Multi-line variant of TextField.tsx's "Form
// inputs" pattern - same visual treatment (label above, Brand Blue focus,
// Danger border + message on error), first real instance of the
// "editable AI-generated draft" need this ticket's own scope note flagged
// as an undocumented gap. Not a new pattern, the same one with a
// <textarea> instead of <input>.
export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  function TextAreaField({ label, error, id, className = '', ...rest }, ref) {
    const generatedId = useId()
    const textareaId = id ?? generatedId
    const errorId = error ? `${textareaId}-error` : undefined

    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={textareaId} className="text-label text-slate-gray font-medium">
          {label}
        </label>
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={`text-body text-ink-navy rounded-lg border px-3 py-2 outline-none disabled:bg-cloud-gray disabled:text-slate-gray disabled:border-transparent focus:border-brand-blue ${
            error ? 'border-danger' : 'border-slate-gray'
          } ${className}`}
          {...rest}
        />
        {error ? (
          <p id={errorId} className="text-label text-danger">
            {error}
          </p>
        ) : null}
      </div>
    )
  },
)
