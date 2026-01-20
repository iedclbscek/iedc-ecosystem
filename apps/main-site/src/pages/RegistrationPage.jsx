import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { sendRegistrationOtp, submitRegistration, verifyRegistrationOtp } from '../services/registrationService';
import toast from 'react-hot-toast';
import { FaArrowLeft, FaCheckCircle, FaUserSecret, FaCode, FaIdCard, FaPaperPlane } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const INITIAL_FORM_DATA = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  admissionNo: '',
  department: '',
  yearOfJoining: '',
  semester: '',
  isLateralEntry: false,
  interests: [],
  nonTechInterests: '',
  experience: '',
  motivation: '',
  linkedin: '',
  github: '',
  portfolio: '',
  referralCode: ''
};

const RegistrationPage = () => {
  // --- 1. State Management ---
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const [errors, setErrors] = useState({});
  
  // Verification States
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerificationField, setShowVerificationField] = useState(false);
  const [otpToken, setOtpToken] = useState('');
  const [canResend, setCanResend] = useState(true);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Constants
  const departments = [ 'CSE', 'CSBS', 'CSE (AI & DS)', 'EEE', 'ECE', 'IT', 'ME', 'CE' ];
  const joiningYears = ['2021', '2022', '2023', '2024', '2025'];
  const semesters = [
    '1st Semester','2nd Semester','3rd Semester','4th Semester',
    '5th Semester','6th Semester','7th Semester','8th Semester'
  ];
  const interestAreas = [ 'Web Dev', 'App Dev', 'AI/ML', 'Data Science', 'Cybersecurity', 'IoT', 'Blockchain', 'Cloud', 'UI/UX', 'Product Mgmt', 'Robotics', 'Game Dev', 'DevOps' ];

  useEffect(() => {
    if (canResend) return;
    if (resendCountdown <= 0) {
      setCanResend(true);
      return;
    }

    const id = setInterval(() => {
      setResendCountdown((v) => Math.max(0, v - 1));
    }, 1000);

    return () => clearInterval(id);
  }, [canResend, resendCountdown]);

  // --- 2. Handlers ---
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (name === 'email' && isEmailVerified) {
      setIsEmailVerified(false);
      setShowVerificationField(false);
      setVerificationCode('');
      setOtpToken('');
    }
  };

  const handleInterestChange = (interest) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest) ? prev.interests.filter(i => i !== interest) : [...prev.interests, interest]
    }));
  };

  // Step Validation
  const validateStep = (step) => {
    const newErrors = {};
    if (step === 1) {
      if (!formData.firstName.trim()) newErrors.firstName = "Required";
      if (!formData.lastName.trim()) newErrors.lastName = "Required";
      if (!formData.email.trim()) newErrors.email = "Required";
      if (!isEmailVerified) newErrors.email = "Verification Required";
      if (!formData.phone.trim()) newErrors.phone = "Required";
    }
    if (step === 2) {
      if (!formData.admissionNo.trim()) newErrors.admissionNo = "Required";
      if (!formData.department) newErrors.department = "Required";
      if (!formData.yearOfJoining) newErrors.yearOfJoining = "Required";
      if (!formData.semester) newErrors.semester = "Required";
      if (formData.referralCode.trim().toUpperCase() !== 'DREAMITDOIT') newErrors.referralCode = "Invalid Code";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) setCurrentStep(prev => prev + 1);
    else toast.error("Please complete all required fields.");
  };

  const prevStep = () => setCurrentStep(prev => prev - 1);

  // --- 3. Email Logic (Server OTP) ---
  const sendVerificationCode = async () => {
    if (!formData.email) return toast.error("Enter email first");
    if (!canResend) return;

    setIsSendingCode(true);
    try {
      await sendRegistrationOtp(formData.email);
      setShowVerificationField(true);
      setResendCountdown(60);
      setCanResend(false);
      toast.success("Verification code sent");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSendingCode(false);
    }
  };

  const verifyCode = async () => {
    if (!formData.email) return toast.error("Enter email first");
    if (!verificationCode.trim()) return toast.error("Enter the code");

    setIsVerifying(true);
    try {
      const data = await verifyRegistrationOtp({
        email: formData.email,
        otp: verificationCode.trim(),
      });

      if (!data?.otpToken) throw new Error("Verification failed");

      setOtpToken(data.otpToken);
      setIsEmailVerified(true);
      setShowVerificationField(false);
      toast.success("Verified!");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitLockRef.current) return;
    if (!validateStep(1) || !validateStep(2)) return;
    if (!otpToken) {
      toast.error("Please verify your email first.");
      setCurrentStep(1);
      setShowVerificationField(true);
      return;
    }
    
    submitLockRef.current = true;
    setIsSubmitting(true);
    try {
      const res = await submitRegistration({ ...formData, otpToken });
      toast.success(
        res?.membershipId
          ? `Submitted! Membership ID: ${res.membershipId}`
          : "Application Protocol Initialized!"
      );

      // Reset the form for a fresh submission.
      setFormData({ ...INITIAL_FORM_DATA });
      setErrors({});
      setCurrentStep(1);

      setIsEmailVerified(false);
      setIsVerifying(false);
      setIsSendingCode(false);
      setVerificationCode('');
      setShowVerificationField(false);
      setOtpToken('');
      setCanResend(true);
      setResendCountdown(0);
    } catch (err) {
      // If the user double-submits, the first request can succeed and the second
      // can return 409. Treat it as "already submitted" rather than "failed".
      if (err?.status === 409 && err?.data?.membershipId) {
        toast.success(`Already submitted! Membership ID: ${err.data.membershipId}`);
      } else {
        toast.error("Transmission Failed: " + (err?.message || "Unknown error"));
      }
    } finally {
      setIsSubmitting(false);
      submitLockRef.current = false;
    }
  };

  // --- 4. Render Components ---
  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center py-20 px-4">
      
      <div className="w-full max-w-5xl grid lg:grid-cols-12 shadow-2xl rounded-2xl overflow-hidden border border-gray-200 bg-white">
        
        {/* LEFT PANEL */}
        <div className="lg:col-span-4 bg-text-dark text-white p-10 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div>
          
          <div>
            <Link to="/" className="inline-flex items-center text-gray-400 hover:text-white mb-8 transition-colors font-mono text-xs uppercase tracking-widest">
              <FaArrowLeft className="mr-2" /> Cancel_Process
            </Link>
            <h1 className="text-3xl font-black uppercase tracking-tighter mb-2">
              Access <br/><span className="text-accent">Request.</span>
            </h1>
            <p className="text-gray-400 text-sm mb-12">
              Initialize your profile to join the IEDC LBSCEK innovation ecosystem.
            </p>

            <div className="space-y-8">
              <StepIndicator step={1} current={currentStep} label="Identity Verification" icon={<FaUserSecret/>} />
              <StepIndicator step={2} current={currentStep} label="Academic Credentials" icon={<FaIdCard/>} />
              <StepIndicator step={3} current={currentStep} label="Skill Assessment" icon={<FaCode/>} />
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/10 text-xs text-gray-500 font-mono">
            SECURE_CONNECTION // TLS 1.3 <br/>
            ID: GUEST_USER
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="lg:col-span-8 p-10 bg-white">
          <form onSubmit={handleSubmit}>
            <AnimatePresence mode='wait'>
              
              {/* STEP 1: PERSONAL */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h3 className="text-xl font-bold text-text-dark border-b border-gray-100 pb-2">
                    01 // Personal_Data
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <InputGroup label="First Name" name="firstName" value={formData.firstName} onChange={handleInputChange} error={errors.firstName} />
                    <InputGroup label="Last Name" name="lastName" value={formData.lastName} onChange={handleInputChange} error={errors.lastName} />
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <InputGroup label="Email Address" name="email" type="email" value={formData.email} onChange={handleInputChange} error={errors.email} disabled={isEmailVerified} />
                      {!isEmailVerified && (
                        <div className="mt-2">
                          {!showVerificationField ? (
                            <button
                              type="button"
                              onClick={sendVerificationCode}
                              disabled={isSendingCode || !formData.email || !canResend}
                              className="text-xs font-bold text-accent hover:underline disabled:opacity-60"
                            >
                              {isSendingCode
                                ? 'Sending_Signal...'
                                : canResend
                                  ? 'Request_Verification_Code'
                                  : `Resend in ${resendCountdown}s`}
                            </button>
                          ) : (
                            <div className="flex gap-2 mt-2 animate-in fade-in slide-in-from-top-2">
                              <input 
                                type="text" 
                                placeholder="123456" 
                                className="w-24 p-2 bg-gray-50 border border-gray-300 text-center font-mono text-sm rounded focus:border-accent outline-none"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value)}
                              />
                              <button type="button" onClick={verifyCode} disabled={isVerifying} className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700">
                                {isVerifying ? 'Verifying...' : 'Confirm'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      {isEmailVerified && <p className="text-xs text-green-600 font-bold mt-1 flex items-center gap-1"><FaCheckCircle/> Verified</p>}
                    </div>
                    
                    <InputGroup label="Phone Number" name="phone" value={formData.phone} onChange={handleInputChange} error={errors.phone} />
                  </div>
                </motion.div>
              )}

              {/* STEP 2: ACADEMIC */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h3 className="text-xl font-bold text-text-dark border-b border-gray-100 pb-2">
                    02 // Academic_Log
                  </h3>

                  <div className="grid md:grid-cols-2 gap-6">
                    <InputGroup label="Admission No" name="admissionNo" value={formData.admissionNo} onChange={handleInputChange} error={errors.admissionNo} />
                    <InputGroup label="Referral Code" name="referralCode" value={formData.referralCode} onChange={handleInputChange} error={errors.referralCode} />
                  </div>

                  {/* Grouped Department and Year of Joining */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <SelectGroup label="Department" name="department" value={formData.department} onChange={handleInputChange} options={departments} error={errors.department} />
                    <SelectGroup label="Year of Joining" name="yearOfJoining" value={formData.yearOfJoining} onChange={handleInputChange} options={joiningYears} error={errors.yearOfJoining} />
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <SelectGroup label="Current Semester" name="semester" value={formData.semester} onChange={handleInputChange} options={semesters} error={errors.semester} />
                    <div></div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input type="checkbox" id="lat" checked={formData.isLateralEntry} onChange={(e) => setFormData({...formData, isLateralEntry: e.target.checked})} className="w-4 h-4 accent-accent" />
                    <label htmlFor="lat" className="text-sm text-text-light">Lateral Entry Candidate</label>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: SKILLS */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h3 className="text-xl font-bold text-text-dark border-b border-gray-100 pb-2">
                    03 // Skill_Matrix
                  </h3>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Technical Domains</label>
                    <div className="flex flex-wrap gap-2">
                      {interestAreas.map(area => (
                        <button
                          key={area}
                          type="button"
                          onClick={() => handleInterestChange(area)}
                          className={`px-3 py-1 text-xs font-mono border transition-all ${
                            formData.interests.includes(area) 
                            ? 'bg-text-dark text-white border-text-dark' 
                            : 'bg-white text-gray-500 border-gray-200 hover:border-accent'
                          }`}
                        >
                          {formData.interests.includes(area) ? '[x] ' : '[ ] '} {area}
                        </button>
                      ))}
                    </div>
                  </div>

                  <InputGroup label="LinkedIn Protocol (URL)" name="linkedin" value={formData.linkedin} onChange={handleInputChange} placeholder="https://..." />
                  
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Motivation Statement</label>
                    <textarea 
                      rows="3"
                      className="w-full bg-gray-50 border border-gray-200 p-3 text-sm focus:border-accent focus:bg-white transition-all outline-none resize-none font-mono"
                      placeholder="Why do you want to join the network?"
                      value={formData.motivation}
                      onChange={(e) => setFormData({...formData, motivation: e.target.value})}
                    ></textarea>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="mt-10 flex justify-between items-center pt-6 border-t border-gray-100">
              {currentStep > 1 ? (
                <button type="button" onClick={prevStep} className="text-gray-400 hover:text-text-dark font-bold text-sm flex items-center gap-2">
                  <FaArrowLeft /> Back
                </button>
              ) : <div></div>}

              {currentStep < 3 ? (
                <button type="button" onClick={nextStep} className="px-8 py-3 bg-text-dark text-white font-mono text-xs font-bold uppercase tracking-widest hover:bg-accent transition-colors">
                  Next_Phase &gt;
                </button>
              ) : (
                <button type="submit" disabled={isSubmitting} className="px-8 py-3 bg-accent text-white font-mono text-xs font-bold uppercase tracking-widest hover:bg-accent-dark transition-colors flex items-center gap-2">
                  {isSubmitting ? 'Transmitting...' : 'Initialize_Protocol'} <FaPaperPlane/>
                </button>
              )}
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

// --- Helper Components ---

const StepIndicator = ({ step, current, label, icon }) => {
  const status = current === step ? 'active' : current > step ? 'completed' : 'pending';
  return (
    <div className={`flex items-center gap-4 transition-all duration-300 ${status === 'pending' ? 'opacity-40' : 'opacity-100'}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
        status === 'active' ? 'border-accent bg-accent text-white' : 
        status === 'completed' ? 'border-green-500 bg-green-500 text-white' : 
        'border-gray-600 text-gray-400'
      }`}>
        {status === 'completed' ? <FaCheckCircle /> : icon}
      </div>
      <div>
        <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Step 0{step}</div>
        <div className="font-bold text-sm">{label}</div>
      </div>
    </div>
  );
};

const InputGroup = ({ label, error, ...props }) => (
  <div>
    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{label}</label>
    <input 
      {...props}
      className={`w-full bg-gray-50 border p-3 text-sm focus:border-accent focus:bg-white transition-all outline-none font-mono ${error ? 'border-red-500' : 'border-gray-200'}`}
    />
    {error && <p className="text-red-500 text-xs mt-1 font-mono">{error}</p>}
  </div>
);

const SelectGroup = ({ label, options, error, ...props }) => (
  <div>
    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{label}</label>
    <select 
      {...props}
      className={`w-full bg-gray-50 border p-3 text-sm focus:border-accent focus:bg-white transition-all outline-none font-mono appearance-none ${error ? 'border-red-500' : 'border-gray-200'}`}
    >
      <option value="">Select...</option>
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
    {error && <p className="text-red-500 text-xs mt-1 font-mono">{error}</p>}
  </div>
);

export default RegistrationPage;