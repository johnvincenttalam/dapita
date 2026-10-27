import { useId, type ReactNode } from 'react'
import {
  Controller,
  type Control,
  type ControllerFieldState,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form'

import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { cn } from '@/lib/utils'

/** Accessibility props to spread onto the form control so label, description and error are wired up. */
export interface FormControlProps {
  id: string
  'aria-invalid': boolean
  'aria-describedby'?: string
  'aria-required'?: boolean
}

export interface FormFieldRenderProps<TValues extends FieldValues, TName extends FieldPath<TValues>> {
  field: ControllerRenderProps<TValues, TName>
  fieldState: ControllerFieldState
  controlProps: FormControlProps
}

export interface FormFieldProps<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
  /** The submitted values, when the schema transforms them (e.g. price text into a number). */
  TTransformed extends FieldValues = TValues,
> {
  control: Control<TValues, unknown, TTransformed>
  name: TName
  label: ReactNode
  description?: ReactNode
  required?: boolean
  /** "horizontal" puts the control beside the label (checkboxes, switches). */
  orientation?: 'vertical' | 'horizontal'
  /** Horizontal only: checkboxes usually sit before the label, switches after it. */
  controlPosition?: 'start' | 'end'
  render: (props: FormFieldRenderProps<TValues, TName>) => ReactNode
  className?: string
}

/**
 * Connects any control to React Hook Form and renders its label, description and
 * validation message with correct ARIA wiring.
 *
 * @example
 * <FormField control={form.control} name="email" label="Email" required
 *   render={({ field, controlProps }) => <Input type="email" {...field} {...controlProps} />} />
 */
export function FormField<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
  TTransformed extends FieldValues = TValues,
>({
  control,
  name,
  label,
  description,
  required,
  orientation = 'vertical',
  controlPosition = 'start',
  render,
  className,
}: FormFieldProps<TValues, TName, TTransformed>) {
  const id = useId()
  const descriptionId = `${id}-description`
  const errorId = `${id}-error`

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const invalid = fieldState.invalid
        const describedBy = [description ? descriptionId : null, invalid ? errorId : null].filter(Boolean).join(' ')
        const controlProps: FormControlProps = {
          id,
          'aria-invalid': invalid,
          'aria-describedby': describedBy || undefined,
          'aria-required': required || undefined,
        }

        const labelNode = (
          <FieldLabel htmlFor={id}>
            {label}
            {required ? (
              <span aria-hidden="true" className="-ml-1 text-destructive">
                *
              </span>
            ) : null}
          </FieldLabel>
        )
        const descriptionNode = description ? (
          <FieldDescription id={descriptionId}>{description}</FieldDescription>
        ) : null
        const errorNode = invalid ? <FieldError id={errorId} errors={[fieldState.error]} /> : null
        const controlNode = render({ field, fieldState, controlProps })

        if (orientation === 'horizontal') {
          return (
            <Field
              orientation="horizontal"
              data-invalid={invalid || undefined}
              className={cn(controlPosition === 'end' && 'justify-between', className)}
            >
              {controlPosition === 'start' ? controlNode : null}
              <FieldContent>
                {labelNode}
                {descriptionNode}
                {errorNode}
              </FieldContent>
              {controlPosition === 'end' ? controlNode : null}
            </Field>
          )
        }

        return (
          <Field data-invalid={invalid || undefined} className={className}>
            {labelNode}
            {controlNode}
            {descriptionNode}
            {errorNode}
          </Field>
        )
      }}
    />
  )
}
