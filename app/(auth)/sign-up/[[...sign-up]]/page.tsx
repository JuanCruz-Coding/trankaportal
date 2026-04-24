import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
      <SignUp />
    </main>
  );
}
