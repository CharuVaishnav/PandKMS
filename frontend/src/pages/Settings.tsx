import { useState } from "react";
import { useAuth } from "@/store/auth";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Smartphone, Mail } from "lucide-react";

export default function Settings() {
  const { user, fetchMe } = useAuth();
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [msg, setMsg] = useState("");

  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [emailDisableSent, setEmailDisableSent] = useState(false);
  const [emailDisableCode, setEmailDisableCode] = useState("");
  const [emailMsg, setEmailMsg] = useState("");

  const setupOtp = async () => {
    const r = await api.post("/otp/setup");
    setQr(r.data.qr_code);
    setMsg("");
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/otp/verify", { code });
      setMsg("Two-factor authentication enabled!");
      setQr(null);
      setCode("");
      await fetchMe();
    } catch {
      setMsg("Invalid code. Try again.");
    }
  };

  const disableOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/otp/disable", { code: disableCode });
      setMsg("Two-factor authentication disabled.");
      setDisableCode("");
      await fetchMe();
    } catch {
      setMsg("Invalid code.");
    }
  };

  const requestEmailOtp = async () => {
    await api.post("/otp/email/request", null, { params: { purpose: "enable" } });
    setEmailCodeSent(true);
    setEmailMsg("");
  };

  const confirmEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/otp/email/confirm", { code: emailCode, purpose: "enable" });
      setEmailMsg("Email OTP enabled!");
      setEmailCodeSent(false);
      setEmailCode("");
      await fetchMe();
    } catch {
      setEmailMsg("Invalid or expired code.");
    }
  };

  const requestEmailDisable = async () => {
    await api.post("/otp/email/request", null, { params: { purpose: "disable" } });
    setEmailDisableSent(true);
    setEmailMsg("");
  };

  const confirmEmailDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/otp/email/confirm", { code: emailDisableCode, purpose: "disable" });
      setEmailMsg("Email OTP disabled.");
      setEmailDisableSent(false);
      setEmailDisableCode("");
      await fetchMe();
    } catch {
      setEmailMsg("Invalid or expired code.");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" /> Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span>{user?.email}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="h-4 w-4" /> Two-Factor Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span>Status</span>
            <span className={user?.totp_enabled ? "text-green-600 font-medium" : "text-amber-500 font-medium"}>
              {user?.totp_enabled ? "Enabled" : "Disabled"}
            </span>
          </div>

          {msg && <p className="text-sm text-primary">{msg}</p>}

          {!user?.totp_enabled && (
            <div className="space-y-3">
              <Button variant="outline" size="sm" onClick={setupOtp}>Set up 2FA</Button>
              {qr && (
                <form onSubmit={verifyOtp} className="space-y-3">
                  <img src={qr} alt="QR code" className="w-40 h-40 border rounded" />
                  <p className="text-xs text-muted-foreground">Scan with your authenticator app, then enter the code below.</p>
                  <div className="space-y-1">
                    <Label>Verification Code</Label>
                    <Input value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} required />
                  </div>
                  <Button type="submit" size="sm">Verify & Enable</Button>
                </form>
              )}
            </div>
          )}

          {user?.totp_enabled && (
            <form onSubmit={disableOtp} className="space-y-3">
              <div className="space-y-1">
                <Label>Enter 2FA code to disable</Label>
                <Input value={disableCode} onChange={(e) => setDisableCode(e.target.value)} maxLength={6} required />
              </div>
              <Button type="submit" size="sm" variant="destructive">Disable 2FA</Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" /> Email OTP
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span>Status</span>
            <span className={user?.email_otp_enabled ? "text-green-600 font-medium" : "text-amber-500 font-medium"}>
              {user?.email_otp_enabled ? "Enabled" : "Disabled"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            When enabled, a one-time code is emailed to you at login. Codes expire after 10 minutes.
          </p>

          {emailMsg && <p className="text-sm text-primary">{emailMsg}</p>}

          {!user?.email_otp_enabled && (
            <div className="space-y-3">
              <Button variant="outline" size="sm" onClick={requestEmailOtp}>Send code to my email</Button>
              {emailCodeSent && (
                <form onSubmit={confirmEmailOtp} className="space-y-3">
                  <div className="space-y-1">
                    <Label>Enter the code we emailed you</Label>
                    <Input value={emailCode} onChange={(e) => setEmailCode(e.target.value)} maxLength={6} required />
                  </div>
                  <Button type="submit" size="sm">Verify & Enable</Button>
                </form>
              )}
            </div>
          )}

          {user?.email_otp_enabled && (
            <div className="space-y-3">
              <Button variant="outline" size="sm" onClick={requestEmailDisable}>Send code to disable</Button>
              {emailDisableSent && (
                <form onSubmit={confirmEmailDisable} className="space-y-3">
                  <div className="space-y-1">
                    <Label>Enter the code we emailed you</Label>
                    <Input value={emailDisableCode} onChange={(e) => setEmailDisableCode(e.target.value)} maxLength={6} required />
                  </div>
                  <Button type="submit" size="sm" variant="destructive">Disable Email OTP</Button>
                </form>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
