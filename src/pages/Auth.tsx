import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import service from "@/services/backend";
import { useLocation } from "react-router-dom";

export default function AuthPage() {
  const location = useLocation();
  const path = location.pathname.toLowerCase();
  const initialMode: "signin" | "signup" = path.includes("register") ? "signup" : path.includes("login") ? "signin" : "signin";
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();

  const submit = async () => {
    const fn = mode === "signin" ? service.signIn : service.signUp;
    const { error } = await fn(email, password);
    if (error) {
      toast({ title: "Auth error", description: error });
    } else {
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{mode === "signin" ? "Sign In" : "Create Account"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button className="w-full" onClick={submit}>{mode === "signin" ? "Sign In" : "Sign Up"}</Button>
          <button
            className="text-sm text-muted-foreground underline"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
