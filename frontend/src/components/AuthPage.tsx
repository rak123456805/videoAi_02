"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { Zap, Mail, Lock, Eye, EyeOff, X, ShieldCheck, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AuthPageProps {
  onAuth: () => void;
  onClose?: () => void;
  initialMode?: "login" | "signup" | "forgot_password" | "reset_password";
}

export function AuthPage({ onAuth, onClose, initialMode = "login" }: AuthPageProps) {
  const [mode, setMode] = useState<"login" | "signup" | "forgot_password" | "reset_password">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    setMode(initialMode);
    setMessage(null);
  }, [initialMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onAuth();
      } else if (mode === "signup") {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({ text: "Check your email to confirm your account!", type: "success" });
      } else if (mode === "forgot_password") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}?type=recovery`,
        });
        if (error) throw error;
        setMessage({ text: "Check your email for the password reset link!", type: "success" });
      } else if (mode === "reset_password") {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setMessage({ text: "Your password has been reset successfully!", type: "success" });
        setTimeout(() => {
          onAuth();
        }, 1500);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Authentication failed";
      setMessage({ text: msg, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const renderTitle = () => {
    switch (mode) {
      case "signup":
        return "Create Account";
      case "forgot_password":
        return "Reset Password";
      case "reset_password":
        return "New Password";
      case "login":
      default:
        return "Welcome Back";
    }
  };

  const renderSubtitle = () => {
    switch (mode) {
      case "signup":
        return "Start comparing and querying your videos";
      case "forgot_password":
        return "Enter your email to receive a recovery link";
      case "reset_password":
        return "Enter your new credentials below";
      case "login":
      default:
        return "AI-powered video content intelligence";
    }
  };

  const renderSubmitButtonText = () => {
    if (loading) {
      return <span className="spinner" style={{ borderTopColor: "white" }} />;
    }
    switch (mode) {
      case "signup":
        return "Create Account";
      case "forgot_password":
        return "Send Reset Link";
      case "reset_password":
        return "Update Password";
      case "login":
      default:
        return "Sign In";
    }
  };

  return (
    <div className="auth-page" style={{ position: onClose ? "fixed" : "relative", inset: 0, zIndex: 1000 }}>
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="auth-close-btn"
            aria-label="Close authentication panel"
          >
            <X size={16} />
          </button>
        )}

        {mode === "forgot_password" && (
          <button
            type="button"
            className="auth-back-btn"
            onClick={() => {
              setMode("login");
              setMessage(null);
            }}
          >
            <ArrowLeft size={14} />
            Back to Sign In
          </button>
        )}

        <div className="auth-logo">
          <div className="auth-logo-icon animate-pulse-slow">
            <Zap size={28} color="white" />
          </div>
          <div className="auth-title">{renderTitle()}</div>
          <div className="auth-sub">{renderSubtitle()}</div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode !== "reset_password" && (
            <div>
              <label className="auth-label">
                <Mail size={12} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
                Email Address
              </label>
              <div className="auth-input-wrapper">
                <input
                  type="email"
                  className="auth-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>
          )}

          {mode !== "forgot_password" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label className="auth-label" style={{ marginBottom: 0 }}>
                  <Lock size={12} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
                  {mode === "reset_password" ? "New Password" : "Password"}
                </label>
                {mode === "login" && (
                  <button
                    type="button"
                    className="auth-forgot-link"
                    onClick={() => {
                      setMode("forgot_password");
                      setMessage(null);
                    }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="auth-input-wrapper" style={{ position: "relative" }}>
                <input
                  type={showPw ? "text" : "password"}
                  className="auth-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="auth-eye-btn"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          )}

          {(mode === "signup" || mode === "reset_password") && (
            <div>
              <label className="auth-label">
                <ShieldCheck size={12} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
                Confirm Password
              </label>
              <div className="auth-input-wrapper" style={{ position: "relative" }}>
                <input
                  type={showConfirmPw ? "text" : "password"}
                  className="auth-input"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  className="auth-eye-btn"
                >
                  {showConfirmPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          )}

          {message && (
            <div
              className={`auth-message-alert ${message.type}`}
            >
              {message.text}
            </div>
          )}

          <button type="submit" className="auth-btn" disabled={loading}>
            {renderSubmitButtonText()}
          </button>
        </form>

        {mode !== "forgot_password" && mode !== "reset_password" && (
          <p className="auth-toggle">
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button
              className="auth-toggle-btn"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setMessage(null);
              }}
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        )}
      </motion.div>
    </div>
  );
}
