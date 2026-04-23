import React, { useState, useEffect } from 'react';
import { X, Phone, KeyRound, Loader2, ShieldCheck, Copy, AlertCircle } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function LoginAsBusinessModal({ tenant, onClose, onSuccess, adminToken }) {
  const [step, setStep] = useState('request'); // request → verify → done
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(`${API}/memoraai/saas-admin/impersonate/request`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenant_id: tenant.id }),
        });
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(err.detail || 'Failed to start login');
        }
        const data = await r.json();
        setSession(data);
        setStep('verify');
      } catch (e) {
        setError(e.message);
      }
      setLoading(false);
    })();
  }, [tenant?.id, adminToken]);

  const verifyOtp = async () => {
    if (!otpInput.trim() || otpInput.length < 4) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API}/memoraai/saas-admin/impersonate/verify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: session.request_id, otp: otpInput.trim() }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.detail || 'OTP verification failed');
      }
      const data = await r.json();
      onSuccess(data);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const copyOtp = async () => {
    if (!session?.dev_otp) return;
    try { await navigator.clipboard.writeText(session.dev_otp); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="login-as-modal"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
      >
        <div className="bg-gradient-to-r from-sky-500 to-blue-400 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            <h2 className="font-bold">Login as Business</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/20" data-testid="close-login-as">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <div>
            <p className="text-[10px] uppercase font-semibold text-gray-500 tracking-wide">Business</p>
            <p className="text-lg font-bold text-gray-900">{tenant.name || 'Unnamed'}</p>
          </div>

          {loading && step === 'request' && (
            <div className="flex items-center gap-2 text-sm text-gray-600 py-4 justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
              Generating secure OTP…
            </div>
          )}

          {step === 'verify' && session && (
            <>
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 space-y-1.5" data-testid="otp-sent-info">
                <p className="text-xs text-sky-900 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> OTP sent to <strong>{session.owner_name}</strong> ({session.masked_phone})
                </p>
                <p className="text-[11px] text-sky-700">
                  Call the business owner, ask them for the 6-digit OTP, and enter it below.
                </p>
              </div>

              {session.dev_otp && (
                <div className="bg-gray-900 text-white rounded-xl p-3 flex items-center justify-between" data-testid="dev-otp-box">
                  <div>
                    <p className="text-[10px] uppercase text-sky-300 font-semibold tracking-wide">Dev mode OTP</p>
                    <p className="font-mono text-xl font-bold tracking-widest">{session.dev_otp}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Visible only until SMS gateway is configured</p>
                  </div>
                  <button
                    onClick={copyOtp}
                    className="text-xs bg-sky-500 hover:bg-sky-400 text-gray-900 font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1"
                    data-testid="copy-otp-btn"
                  >
                    <Copy className="w-3.5 h-3.5" /> {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}

              <label className="block">
                <span className="text-[11px] font-semibold text-gray-600 mb-1 block flex items-center gap-1">
                  <KeyRound className="w-3 h-3" /> Enter OTP from business owner
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="6-digit OTP"
                  className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl text-center text-xl font-mono tracking-widest focus:outline-none focus:border-sky-400"
                  data-testid="otp-input"
                  autoFocus
                />
              </label>

              {error && (
                <p className="text-xs text-red-600 flex items-center gap-1" data-testid="otp-error">
                  <AlertCircle className="w-3 h-3" /> {error}
                </p>
              )}
            </>
          )}

          {error && step === 'request' && (
            <p className="text-xs text-red-600 flex items-start gap-1" data-testid="request-error">
              <AlertCircle className="w-3 h-3 mt-0.5" /> {error}
            </p>
          )}
        </div>

        <div className="px-5 py-3 bg-gray-50 border-t flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
            data-testid="cancel-login-as"
          >
            Cancel
          </button>
          {step === 'verify' && (
            <button
              onClick={verifyOtp}
              disabled={loading || otpInput.length < 4}
              className="flex-1 flex items-center justify-center gap-1.5 bg-sky-500 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-sky-600 disabled:opacity-50"
              data-testid="verify-otp-btn"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Verify & Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
