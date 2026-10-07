import { useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { Link, useNavigate } from "react-router-dom";
import {
  AuthLayout,
  FormError,
  fieldInputClass,
  fieldLabelClass,
  submitButtonClass,
} from "../components/AuthLayout";
import { useAuth } from "../context/useAuth";

export function RegisterPage() {
  const demoEmail = import.meta.env.VITE_DEMO_EMAIL;
  const demoPassword = import.meta.env.VITE_DEMO_PASSWORD;
  const hasDemoAccess = Boolean(demoEmail && demoPassword);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  async function handleDemoLogin() {
    if (!demoEmail || !demoPassword) return;

    setError(null);
    setIsSubmitting(true);
    try {
      await login(demoEmail, demoPassword);
      navigate("/dashboard");
    } catch {
      setError("Unable to enter demo");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register(email, password);
      navigate("/dashboard");
    } catch (err: unknown) {
      const msg =
        isAxiosError(err) && err.response?.status === 409
          ? "Email already registered"
          : "Registration failed";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create account"
      subtitle="Upload audio and video, and get transcripts and summaries."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-ink underline underline-offset-2">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        {error && <FormError message={error} />}

        <label htmlFor="email" className={fieldLabelClass}>
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting}
          className={`${fieldInputClass} mb-4`}
        />

        <label htmlFor="password" className={fieldLabelClass}>
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isSubmitting}
          className={fieldInputClass}
        />
        <p className="mt-1.5 mb-6 text-xs text-ink-faint">
          At least 8 characters.
        </p>

        <button
          type="submit"
          disabled={isSubmitting}
          className={submitButtonClass}
        >
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>

        {hasDemoAccess && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => void handleDemoLogin()}
            className="mt-3 w-full rounded-md border border-line-strong py-2 text-sm font-medium text-ink transition-colors hover:bg-panel disabled:opacity-40"
          >
            {isSubmitting ? "Entering demo..." : "Enter demo"}
          </button>
        )}
      </form>
    </AuthLayout>
  );
}
