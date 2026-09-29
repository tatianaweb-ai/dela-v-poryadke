"use client";

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

const BASE =
  "w-full rounded-xl border bg-white px-3.5 text-sm text-slate-900 shadow-sm transition-colors " +
  "placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 " +
  "disabled:cursor-not-allowed disabled:bg-slate-50";

function borderClass(error?: string): string {
  return error
    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10"
    : "border-slate-200";
}

export interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  htmlFor: string;
  required?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...props }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(BASE, borderClass(invalid ? "error" : undefined), "h-11", className)}
        {...props}
      />
    );
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ className, invalid, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(BASE, borderClass(invalid ? "error" : undefined), "min-h-24 py-2.5", className)}
      {...props}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(function Select({ className, invalid, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(BASE, borderClass(invalid ? "error" : undefined), "h-11 pr-9", className)}
      {...props}
    >
      {children}
    </select>
  );
});

export function Field({ label, error, hint, htmlFor, required, children }: FieldProps & { children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-rose-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}
