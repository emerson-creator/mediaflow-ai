import { Link } from "react-router-dom";
import { AuthLayout, submitButtonClass } from "../components/AuthLayout";

export function TooManyRequestsPage() {
  return (
    <AuthLayout
      title="Too many requests"
      subtitle="Please wait a moment before trying again."
      footer={
        <Link to="/login" className="text-ink underline underline-offset-2">
          Back to sign in
        </Link>
      }
    >
      <div
        role="alert"
        className="rounded-md border border-line bg-panel px-4 py-3 text-sm text-ink-dim"
      >
        The service is temporarily limiting requests to keep things running
        smoothly.
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className={`${submitButtonClass} mt-4`}
      >
        Try again
      </button>
    </AuthLayout>
  );
}
