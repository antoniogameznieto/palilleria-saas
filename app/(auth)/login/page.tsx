import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type LoginPageProps = {
  searchParams: Promise<{
    registered?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const showRegisteredMessage = params.registered === "1";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Iniciar sesión</CardTitle>
        <CardDescription>
          Accede a tu cuenta para gestionar trabajos y palillería.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {showRegisteredMessage ? (
          <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground">
            Cuenta creada correctamente. Inicia sesión para continuar.
          </p>
        ) : null}
        <LoginForm />
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/" className="underline-offset-4 hover:underline">
            Volver al inicio
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
