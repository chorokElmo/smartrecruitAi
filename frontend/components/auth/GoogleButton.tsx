"use client";
import { GoogleLogin } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/store/authStore";

export function GoogleButton({ onError }: { onError?: (m: string) => void }) {
  const router  = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) return null;

  return (
    <div className="flex justify-center">
      <GoogleLogin
        text="continue_with"
        onSuccess={async (resp) => {
          try {
            const { data: tok } = await authApi.google(resp.credential!);
            localStorage.setItem("access_token", tok.access_token);
            const { data: user } = await authApi.me();
            setAuth(user, tok.access_token);
            router.push("/dashboard");
          } catch {
            onError?.("Échec de la connexion Google.");
          }
        }}
        onError={() => onError?.("Échec de la connexion Google.")}
      />
    </div>
  );
}
