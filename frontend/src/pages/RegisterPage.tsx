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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

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
      </form>
    </AuthLayout>
  );
}
