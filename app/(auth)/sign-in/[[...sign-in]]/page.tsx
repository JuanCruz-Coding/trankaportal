import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
      <SignIn />
    </main>
  );
}
