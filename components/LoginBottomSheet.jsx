'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useActivityLog } from '../context/ActivityLogContext';

export default function LoginBottomSheet({ isOpen, onClose }) {
  const { login } = useAuth();
  const { logActivity } = useActivityLog();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [userName, setUserName] = useState('');
  const [step, setStep] = useState('phone'); // 'phone', 'otp', or 'name'
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const otpInputRefs = useRef([]);
  const nameInputRef = useRef(null);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Reset form when sheet closes
  useEffect(() => {
    if (!isOpen) {
      setStep('phone');
      setPhoneNumber('');
      setOtp(['', '', '', '', '', '']);
      setUserName('');
      setGeneratedOtp(null);
      setError('');
      setSuccess(false);
      setShowSuccessAnimation(false);
    }
  }, [isOpen]);

  // Auto-focus first OTP input when step changes to OTP
  useEffect(() => {
    if (step === 'otp' && otpInputRefs.current[0]) {
      otpInputRefs.current[0].focus();
    }
  }, [step]);

  // Auto-focus name input when step changes to name
  useEffect(() => {
    if (step === 'name' && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [step]);

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate phone number (basic validation - 10 digits)
    const cleanedPhone = phoneNumber.replace(/\D/g, '');
    if (cleanedPhone.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setIsSendingOtp(true);
    setError('');

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Generate a random 6-digit OTP (for frontend demo)
    const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(randomOtp);
    
    // Log OTP to console for easy copy-paste during development
    console.log('🔐 OTP Generated:', randomOtp);
    console.log('📱 Phone Number:', phoneNumber);
    
    // Show OTP in alert for development/testing
    alert(`🔐 OTP for Development\n\nPhone: ${phoneNumber}\nOTP: ${randomOtp}\n\n(For testing purposes only)`);
    
    // In a real app, this would be sent via SMS
    // For demo purposes, we'll show it in a styled notification
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);

    setIsSendingOtp(false);
    setStep('otp');
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return; // Only allow single digit
    
    const newOtp = [...otp];
    newOtp[index] = value.replace(/\D/g, '');
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 5 && otpInputRefs.current[index + 1]) {
      otpInputRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1].focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pastedData[i] || '';
    }
    setOtp(newOtp);
    if (pastedData.length === 6 && otpInputRefs.current[5]) {
      otpInputRefs.current[5].focus();
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    const otpString = otp.join('');

    if (otpString.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setIsVerifyingOtp(true);
    setError('');

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify OTP (in production, this would be verified on the backend)
    if (otpString === generatedOtp) {
      // Show success animation
      setShowSuccessAnimation(true);
      
      // Move to name step after animation
      setTimeout(() => {
        setShowSuccessAnimation(false);
        setStep('name');
      }, 2000);
    } else {
      setError('Invalid OTP. Please try again.');
      setOtp(['', '', '', '', '', '']);
      if (otpInputRefs.current[0]) {
        otpInputRefs.current[0].focus();
      }
    }

    setIsVerifyingOtp(false);
  };

  const handleNameSubmit = (e) => {
    e.preventDefault();
    
    if (!userName.trim()) {
      setError('Please enter your name');
      return;
    }

    // Create user object with the provided name
    const userData = {
      id: Date.now().toString(),
      phone: phoneNumber,
      name: userName.trim(),
      email: null,
      createdAt: new Date().toISOString(),
    };

    // Show success animation
    setShowSuccessAnimation(true);
    
    // Login and close after animation
    setTimeout(() => {
      setShowSuccessAnimation(false);
      logActivity('account_created', { phone: phoneNumber, name: userName });
      logActivity('login', { phone: phoneNumber });
      login(userData);
      onClose();
    }, 2000);
  };

  const handleResendOtp = async () => {
    setIsSendingOtp(true);
    setError('');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Generate new OTP
    const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(randomOtp);
    
    // Log OTP to console for easy copy-paste during development
    console.log('🔐 OTP Resent:', randomOtp);
    console.log('📱 Phone Number:', phoneNumber);
    
    // Show OTP in alert for development/testing
    alert(`🔐 OTP Resent for Development\n\nPhone: ${phoneNumber}\nOTP: ${randomOtp}\n\n(For testing purposes only)`);
    
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
    setIsSendingOtp(false);
    setOtp(['', '', '', '', '', '']);
    if (otpInputRefs.current[0]) {
      otpInputRefs.current[0].focus();
    }
  };

  // Render form content (shared between mobile and desktop)
  const renderFormContent = () => (
    <>
      {/* Success Message */}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 animate-fade-in">
          <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-green-800">
            {step === 'phone' 
              ? `OTP sent! Demo OTP: ${generatedOtp} (In production, this would be sent via SMS)`
              : 'OTP verified successfully! Logging you in...'}
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 animate-fade-in">
          <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {step === 'phone' ? (
        <form onSubmit={handlePhoneSubmit} className="space-y-5">
          <div>
            <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
              Phone Number
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span className="text-gray-400 text-sm">+91</span>
                <div className="w-px h-5 bg-gray-300" />
              </div>
              <input
                type="tel"
                id="phone"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  setError('');
                }}
                placeholder="Enter your 10-digit phone number"
                className="w-full pl-20 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-base transition-all bg-white"
                required
                maxLength={15}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              We'll send you a verification code via SMS
            </p>
          </div>

          <button
            type="submit"
            disabled={isSendingOtp}
            className="w-full bg-amber-500 text-white py-4 rounded-xl font-semibold hover:bg-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {isSendingOtp ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Sending OTP...</span>
              </>
            ) : (
              <>
                <span>Send OTP</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
        </form>
      ) : step === 'otp' ? (
        <form onSubmit={handleOtpSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-4 text-center">
              Enter 6-digit OTP
            </label>
            <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (otpInputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-white"
                />
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center flex items-center justify-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              OTP sent to {phoneNumber}
            </p>
          </div>

          <button
            type="submit"
            disabled={isVerifyingOtp || otp.join('').length !== 6}
            className="w-full bg-amber-500 text-white py-4 rounded-xl font-semibold hover:bg-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {isVerifyingOtp ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <span>Verify OTP</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </>
            )}
          </button>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={isSendingOtp}
              className="w-full text-amber-600 hover:text-amber-700 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSendingOtp ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Resending...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Didn't receive OTP? Resend</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setOtp(['', '', '', '', '', '']);
                setError('');
              }}
              className="w-full text-gray-600 hover:text-gray-800 font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Change Phone Number</span>
            </button>
          </div>
        </form>
      ) : step === 'name' ? (
        <form onSubmit={handleNameSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 text-center">
              What should we call you?
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={userName}
              onChange={(e) => {
                setUserName(e.target.value);
                setError('');
              }}
              placeholder="Enter your name"
              className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-base transition-all bg-white text-center"
              required
              maxLength={50}
            />
            <p className="text-xs text-gray-500 mt-2 text-center flex items-center justify-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              This helps us personalize your experience
            </p>
          </div>

          <button
            type="submit"
            disabled={!userName.trim()}
            className="w-full bg-amber-500 text-white py-4 rounded-xl font-semibold hover:bg-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <span>Continue</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </form>
      ) : null}
    </>
  );

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className={`fixed inset-0 bg-black z-[70] md:hidden transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        style={{ transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
      />

      {/* Desktop Modal Container */}
      <div
        className={`hidden md:flex md:fixed md:inset-0 md:items-center md:justify-center z-[71] ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Desktop: Centered Modal */}
        <div
          className={`hidden md:block bg-white rounded-2xl shadow-2xl z-[70] transform relative ${
            isOpen
              ? 'scale-100 opacity-100'
              : 'scale-95 opacity-0 pointer-events-none'
          }`}
          style={{
            maxHeight: '90vh',
            width: '100%',
            maxWidth: '28rem',
            transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            willChange: isOpen ? 'transform, opacity' : 'auto'
          }}
        >
          {/* Success Animation Overlay - Desktop */}
          {showSuccessAnimation && (
            <div className="absolute inset-0 bg-white rounded-2xl flex items-center justify-center z-50 animate-fade-in">
              <div className="flex flex-col items-center justify-center p-6">
                <img
                  src="/gif/success.gif"
                  alt="Success"
                  className="w-80 h-80 object-contain"
                />
                <p className="text-xl font-semibold text-gray-800 mt-4 animate-fade-in">
                  Account Created Successfully!
                </p>
              </div>
            </div>
          )}

          {/* Handle Bar - Mobile only */}
          <div className="hidden md:block"></div>

          {/* Header with Icon - Desktop */}
          <div className="px-6 pt-6 pb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center shadow-lg">
                  {step === 'phone' ? (
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  ) : step === 'otp' ? (
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {step === 'phone' ? 'Welcome Back!' : step === 'otp' ? 'Verify OTP' : 'Tell us your name'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {step === 'phone' ? 'Enter your phone number to continue' : step === 'otp' ? 'Enter the code sent to your phone' : 'We\'d love to know what to call you'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            
            {/* Progress Indicator */}
            <div className="flex gap-2">
              <div className={`h-1 flex-1 rounded-full transition-all duration-300 ${step === 'phone' ? 'bg-amber-500' : 'bg-gray-200'}`} />
              <div className={`h-1 flex-1 rounded-full transition-all duration-300 ${step === 'otp' ? 'bg-amber-500' : 'bg-gray-200'}`} />
              <div className={`h-1 flex-1 rounded-full transition-all duration-300 ${step === 'name' ? 'bg-amber-500' : 'bg-gray-200'}`} />
            </div>
          </div>

          {/* Content - Desktop */}
          <div className="px-6 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
            {renderFormContent()}
          </div>
        </div>
      </div>

      {/* Mobile: Bottom Sheet - Fixed at bottom */}
      <div
        className={`md:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-b from-white to-gray-50 rounded-t-3xl shadow-2xl z-[70] ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          maxHeight: '90vh',
          width: '100%',
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: isOpen ? 'transform, opacity' : 'auto'
        }}
      >
          {/* Success Animation Overlay */}
          {showSuccessAnimation && (
            <div className="absolute inset-0 bg-white rounded-t-3xl md:rounded-2xl flex items-center justify-center z-50 animate-fade-in">
              <div className="flex flex-col items-center justify-center p-6">
                <img
                  src="/gif/success.gif"
                  alt="Success"
                  className="w-64 h-64 md:w-80 md:h-80 object-contain"
                />
                <p className="text-lg md:text-xl font-semibold text-gray-800 mt-4 animate-fade-in">
                  Account Created Successfully!
                </p>
              </div>
            </div>
          )}

        {/* Handle Bar - Mobile only */}
        <div className="flex justify-center pt-4 pb-3 md:hidden">
          <div className="w-16 h-1.5 bg-amber-500 rounded-full" />
        </div>

        {/* Header with Icon */}
        <div className="px-6 pb-6 md:pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center shadow-lg">
                {step === 'phone' ? (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                ) : step === 'otp' ? (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {step === 'phone' ? 'Welcome Back!' : step === 'otp' ? 'Verify OTP' : 'Tell us your name'}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {step === 'phone' ? 'Enter your phone number to continue' : step === 'otp' ? 'Enter the code sent to your phone' : 'We\'d love to know what to call you'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          
          {/* Progress Indicator */}
          <div className="flex gap-2">
            <div className={`h-1 flex-1 rounded-full transition-all duration-300 ${step === 'phone' ? 'bg-amber-500' : 'bg-gray-200'}`} />
            <div className={`h-1 flex-1 rounded-full transition-all duration-300 ${step === 'otp' ? 'bg-amber-500' : 'bg-gray-200'}`} />
            <div className={`h-1 flex-1 rounded-full transition-all duration-300 ${step === 'name' ? 'bg-amber-500' : 'bg-gray-200'}`} />
          </div>
        </div>

        {/* Content - Mobile */}
        <div className="px-6 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {renderFormContent()}
        </div>
      </div>
    </>
  );
}

