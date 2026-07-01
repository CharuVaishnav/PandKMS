import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Smartphone, Mail, ArrowLeft } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Method = "totp" | "email" | null;

export default function SetupTwoFactor() {
  const { token, user, fetchMe } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token]);

  const [method, setMethod] = useState<Method>(null);
  const [error, setError] = useState("");

  // TOTP state
  const [qr, setQr] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");

  // Email OTP state
  const [emailSent, setEmailSent] = useState(false);
  const [emailCode, setEmailCode] = useState("");

  const chooseTotp = async () => {
    setMethod("totp");
    setError("");
    const r = await api.post("/otp/setup");
    setQr(r.data.qr_code);
  };

  const chooseEmail = async () => {
    setMethod("email");
    setError("");
    try {
      await api.post("/otp/email/request", null, { params: { purpose: "enable" } });
      setEmailSent(true);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Could not send code.");
    }
  };

  const verifyTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/otp/verify", { code: totpCode });
      await fetchMe();
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Invalid code.");
    }
  };

  const verifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/otp/email/confirm", { code: emailCode, purpose: "enable" });
      await fetchMe();
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Invalid or expired code.");
    }
  };

  const backToChoice = () => {
    setMethod(null);
    setError("");
    setQr(null);
    setTotpCode("");
    setEmailSent(false);
    setEmailCode("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Secure your account</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {user?.email ? `Signed in as ${user.email}. ` : ""}
            Two-factor authentication is required before you can continue.
          </p>
        </CardHeader>
        <CardContent>
          {method === null && (
            <div className="space-y-3">
              <button
                onClick={chooseTotp}
                className="w-full flex items-center gap-3 rounded-md border p-3 text-left hover:bg-accent transition-colors"
              >
                <Smartphone className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <div className="text-sm font-medium">Authenticator App</div>
                  <div className="text-xs text-muted-foreground">Scan a QR code with Google Authenticator, Authy, etc.</div>
                </div>
              </button>
              <button
                onClick={chooseEmail}
                className="w-full flex items-center gap-3 rounded-md border p-3 text-left hover:bg-accent transition-colors"
              >
                <Mail className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <div className="text-sm font-medium">Email Code</div>
                  <div className="text-xs text-muted-foreground">Get a one-time code emailed to you at every login.</div>
                </div>
              </button>
            </div>
          )}

          {method === "totp" && (
            <form onSubmit={verifyTotp} className="space-y-3">
              <button type="button" onClick={backToChoice} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3 w-3" /> Choose a different method
              </button>
              {qr && <img src={qr} alt="QR code" className="w-40 h-40 border rounded mx-auto" />}
              <p className="text-xs text-muted-foreground text-center">Scan with your authenticator app, then enter the code below.</p>
              <div className="space-y-1">
                <Label>Verification Code</Label>
                <Input value={totpCode} onChange={(e) => setTotpCode(e.target.value)} maxLength={6} required autoFocus />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full">Verify & Continue</Button>
            </form>
          )}

          {method === "email" && (
            <form onSubmit={verifyEmail} className="space-y-3">
              <button type="button" onClick={backToChoice} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3 w-3" /> Choose a different method
              </button>
              <p className="text-xs text-muted-foreground">
                {emailSent ? "Check your email for a 6-digit code." : "Sending code…"}
              </p>
              <div className="space-y-1">
                <Label>Verification Code</Label>
                <Input value={emailCode} onChange={(e) => setEmailCode(e.target.value)} maxLength={6} required autoFocus />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={!emailSent}>Verify & Continue</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
