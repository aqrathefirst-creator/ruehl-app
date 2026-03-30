'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type AuthMode = 'signin' | 'signup';
type SignupMethod = 'email' | 'mobile';

const looksLikePhone = (value: string) => /^\+?[0-9]{8,15}$/.test(value.trim());

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [signupMethod, setSignupMethod] = useState<SignupMethod>('email');

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const [username, setUsername] = useState('');
  const [signupIdentifier, setSignupIdentifier] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  const [resetValue, setResetValue] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const [awaitingTwoFactor, setAwaitingTwoFactor] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetFeedback = () => {
    setMessage(null);
    setError(null);
  };

  const handleSignIn = async () => {
    resetFeedback();

    if (!identifier.trim() || !password) {
      setError('Enter your username, email, or mobile number, and password.');
      return;
    }

    setLoading(true);

    try {
      const id = identifier.trim();
      let authError: any = null;

      if (id.includes('@')) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: id,
          password,
        });
        authError = signInError;
      } else if (looksLikePhone(id)) {
        const normalized = id.startsWith('+') ? id : `+${id}`;
        const { error: signInError } = await supabase.auth.signInWithPassword({
          phone: normalized,
          password,
        });
        authError = signInError;
      } else {
        const { data: userProfile, error: profileLookupError } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', id)
          .single();

        const emailValue =
          (userProfile as any)?.email ||
          (userProfile as any)?.contact_email ||
          null;
        const phoneValue =
          (userProfile as any)?.phone ||
          (userProfile as any)?.mobile ||
          (userProfile as any)?.mobile_number ||
          null;

        if (profileLookupError || (!emailValue && !phoneValue)) {
          setError('Username login is not configured for this account yet. Use email or mobile.');
          setLoading(false);
          return;
        }

        if (emailValue) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: emailValue,
            password,
          });
          authError = signInError;
        } else if (phoneValue) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            phone: phoneValue,
            password,
          });
          authError = signInError;
        }
      }

      if (authError) {
        setError(authError.message || 'Unable to sign in. Please check your credentials.');
        setLoading(false);
        return;
      }

      const { data: authData } = await supabase.auth.getUser();
      const signedInUser = authData.user;

      if (signedInUser?.id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('two_factor_enabled')
          .eq('id', signedInUser.id)
          .single();

        if (profileData?.two_factor_enabled) {
          const mfa = supabase.auth.mfa as any;
          const { data: factorData, error: factorsError } = await mfa.listFactors();

          if (factorsError) {
            setError(factorsError.message || 'Unable to start 2FA challenge.');
            setLoading(false);
            return;
          }

          const factorId = factorData?.totp?.[0]?.id || null;

          if (!factorId) {
            setError('2FA is enabled but no authenticator factor was found.');
            setLoading(false);
            return;
          }

          const { data: challengeData, error: challengeError } = await mfa.challenge({
            factorId,
          });

          if (challengeError || !challengeData?.id) {
            setError(challengeError?.message || 'Unable to create 2FA challenge.');
            setLoading(false);
            return;
          }

          setMfaFactorId(factorId);
          setMfaChallengeId(challengeData.id);
          setAwaitingTwoFactor(true);
          setMessage('Enter the OTP from your authenticator app to finish signing in.');
          setLoading(false);
          return;
        }
      }

      setMessage('Signed in successfully.');
      router.replace('/');
    } catch (err: any) {
      setError(err?.message || 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTwoFactor = async () => {
    resetFeedback();

    if (!mfaFactorId || !mfaChallengeId || !otpCode.trim()) {
      setError('Enter your OTP code to continue.');
      return;
    }

    setLoading(true);
    try {
      const mfa = supabase.auth.mfa as any;
      const { error: verifyError } = await mfa.verify({
        factorId: mfaFactorId,
        challengeId: mfaChallengeId,
        code: otpCode.trim(),
      });

      if (verifyError) {
        setError(verifyError.message || 'Invalid OTP code.');
        setLoading(false);
        return;
      }

      setAwaitingTwoFactor(false);
      setMfaFactorId(null);
      setMfaChallengeId(null);
      setOtpCode('');
      setMessage('Signed in successfully.');
      router.replace('/');
    } catch (err: any) {
      setError(err?.message || 'Unable to verify OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    resetFeedback();

    if (!resetValue.trim()) {
      setError('Enter your email or mobile number to reset.');
      return;
    }

    setLoading(true);

    try {
      const value = resetValue.trim();

      if (value.includes('@')) {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(value, {
          redirectTo: `${window.location.origin}/login`,
        });

        if (resetError) throw resetError;

        setMessage('Password reset email sent.');
      } else {
        const normalized = value.startsWith('+') ? value : `+${value}`;
        const { error: otpError } = await supabase.auth.signInWithOtp({
          phone: normalized,
          options: { shouldCreateUser: false },
        });

        if (otpError) throw otpError;

        setMessage('Reset OTP sent to your mobile number.');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    resetFeedback();

    if (!username.trim() || !signupIdentifier.trim() || !signupPassword) {
      setError('Enter username, account identifier, and password.');
      return;
    }

    setLoading(true);

    try {
      let authError: any = null;
      let createdUser: any = null;

      if (signupMethod === 'email') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: signupIdentifier.trim(),
          password: signupPassword,
          options: {
            data: { username: username.trim() },
          },
        });
        authError = signUpError;
        createdUser = data.user;
      } else {
        const normalized = signupIdentifier.trim().startsWith('+')
          ? signupIdentifier.trim()
          : `+${signupIdentifier.trim()}`;

        const { data, error: signUpError } = await supabase.auth.signUp({
          phone: normalized,
          password: signupPassword,
          options: {
            data: { username: username.trim() },
          },
        });
        authError = signUpError;
        createdUser = data.user;
      }

      if (authError) {
        setError(authError.message || 'Unable to create account.');
        setLoading(false);
        return;
      }

      if (createdUser?.id) {
        await supabase.from('profiles').upsert({
          id: createdUser.id,
          username: username.trim(),
          avatar_url: null,
        });
      }

      setMessage('Account created successfully. Please sign in.');
      setMode('signin');
      setIdentifier(signupIdentifier.trim());
      setPassword('');
      setSignupPassword('');
    } catch (err: any) {
      setError(err?.message || 'Unable to create account.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    resetFeedback();
    setLoading(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (oauthError) setError(oauthError.message);
    setLoading(false);
  };

  return (
    <div className="flex justify-center min-h-screen bg-black">
      <div className="w-full max-w-[430px] flex flex-col justify-center px-6 py-10 text-white">
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            RUEHL
          </h1>
          <p className="text-gray-500 mt-3 text-sm">Your elite training community</p>
        </div>

        <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 backdrop-blur">
          {mode === 'signin' ? (
            <>
              <h2 className="text-xl font-semibold">Sign In</h2>

              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Username, email, or mobile number"
                className="w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2.5 text-sm placeholder:text-gray-500"
              />

              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="Password"
                className="w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2.5 text-sm placeholder:text-gray-500"
              />

              {awaitingTwoFactor && (
                <input
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Authenticator OTP"
                  className="w-full rounded-xl bg-white/10 border border-green-400/40 px-3 py-2.5 text-sm placeholder:text-gray-500"
                />
              )}

              <div className="space-y-2 rounded-xl bg-white/5 border border-white/10 p-3">
                <div className="text-xs font-medium text-gray-400">Forgot password?</div>
                <input
                  value={resetValue}
                  onChange={(e) => setResetValue(e.target.value)}
                  placeholder="Email address or mobile number"
                  className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-xs placeholder:text-gray-500"
                />
                <button
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className="w-full py-2 rounded-lg bg-white/10 border border-white/20 text-sm"
                >
                  Reset Password
                </button>

                {awaitingTwoFactor ? (
                  <button
                    onClick={handleVerifyTwoFactor}
                    disabled={loading}
                    className="w-full rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 py-2.5 text-sm font-semibold disabled:opacity-50"
                  >
                    {loading ? 'Please wait...' : 'Verify OTP'}
                  </button>
                ) : (
                  <button
                    onClick={handleSignIn}
                    disabled={loading}
                    className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 py-2.5 text-sm font-semibold disabled:opacity-50"
                  >
                    {loading ? 'Please wait...' : 'Sign In'}
                  </button>
                )}
              </div>

              <div className="relative py-1">
                <div className="h-px bg-white/10" />
                <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 px-2 bg-[#101010] text-xs text-gray-500">or</span>
              </div>

              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white text-black font-semibold"
              >
                Continue with Google
              </button>

              <div className="text-center text-sm text-gray-400 pt-1">
                <button
                  onClick={() => {
                    resetFeedback();
                    setMode('signup');
                  }}
                  className="text-purple-400"
                >
                  Create account
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold">Create Account</h2>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSignupMethod('email')}
                  className={`py-2 rounded-lg text-sm border ${
                    signupMethod === 'email'
                      ? 'bg-white text-black border-white'
                      : 'bg-white/10 border-white/20 text-white'
                  }`}
                >
                  Sign up with email
                </button>
                <button
                  onClick={() => setSignupMethod('mobile')}
                  className={`py-2 rounded-lg text-sm border ${
                    signupMethod === 'mobile'
                      ? 'bg-white text-black border-white'
                      : 'bg-white/10 border-white/20 text-white'
                  }`}
                >
                  Start with mobile
                </button>
              </div>

              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2.5 text-sm placeholder:text-gray-500"
              />

              <input
                value={signupIdentifier}
                onChange={(e) => setSignupIdentifier(e.target.value)}
                placeholder={signupMethod === 'email' ? 'Email address' : 'Mobile number (+countrycode)'}
                className="w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2.5 text-sm placeholder:text-gray-500"
              />

              <input
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                type="password"
                placeholder="Password"
                className="w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2.5 text-sm placeholder:text-gray-500"
              />

              <button
                onClick={handleSignUp}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold"
              >
                {loading ? 'Please wait...' : 'Create Account'}
              </button>

              <div className="text-center text-sm text-gray-400 pt-1">
                <button
                  onClick={() => {
                    resetFeedback();
                    setMode('signin');
                  }}
                  className="text-purple-400"
                >
                  I already have an account
                </button>
              </div>
            </>
          )}

          {message && (
            <div className="rounded-lg bg-green-500/10 border border-green-500/30 text-green-300 text-xs p-2">
              {message}
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs p-2">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}