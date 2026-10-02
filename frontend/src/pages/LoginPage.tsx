import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AuthLayout,
  FormError,
  fieldInputClass,
  fieldLabelClass,
  submitButtonClass,
} from "../components/AuthLayout";
import { useAuth } from "../context/useAuth";

export function LoginPage() {
  const demoEmail = import.meta.env.VITE_DEMO_EMAIL;
  const demoPassword = import.meta.env.VITE_DEMO_PASSWORD;
  const hasDemoAccess = Boolean(demoEmail && demoPassword);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function signIn(emailAddress: string, passwordValue: string) {
    setError(null);
    setIsSubmitting(true);
    try {
      await login(emailAddress, passwordValue);
      navigate("/dashboard");
    } catch {
      setError("Invalid email or password");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void signIn(email, password);
  }

  function handleDemoLogin() {
    if (!demoEmail || !demoPassword) return;
    void signIn(demoEmail, demoPassword);
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Access your media and live processing status."
      footer={
        <>
          No account?{" "}
          <Link
            to="/register"
            className="text-ink underline underline-offset-2"
          >
            Create one
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
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isSubmitting}
          className={`${fieldInputClass} mb-6`}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className={submitButtonClass}
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>

        {hasDemoAccess && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleDemoLogin}
            className="mt-3 w-full rounded-md border border-line-strong py-2 text-sm font-medium text-ink transition-colors hover:bg-panel disabled:opacity-40"
          >
            {isSubmitting ? "Signing in..." : "Try demo"}
          </button>
        )}
      </form>
    </AuthLayout>
  );
}
