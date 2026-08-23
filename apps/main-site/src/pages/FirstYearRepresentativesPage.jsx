import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { FaArrowRight, FaArrowLeft, FaCheckCircle, FaSpinner, FaPaperPlane } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import {
  requestVerification,
  verifyOtp,
  getProfile,
  submitApplication,
} from '../services/firstYearRepService';

// --- Shared Inputs (Same as Registration) ---
const InputGroup = ({ label, name, value, onChange, placeholder, error, disabled, uppercase }) => (
  <div className="mb-4">
    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{label}</label>
    <input
      type="text"
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`w-full bg-gray-50 border ${error ? 'border-red-500' : 'border-gray-200'} p-3 text-sm focus:border-accent focus:bg-white transition-all outline-none font-mono ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${uppercase ? 'uppercase' : ''}`}
      placeholder={placeholder}
    />
    {error && <p className="text-red-500 text-xs mt-1 font-mono">{error}</p>}
  </div>
);

const TextareaGroup = ({ label, description, value, onChange, placeholder, error, maxLength }) => {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div 
      className="mb-4"
      animate={error && !shouldReduceMotion ? { x: [-5, 5, -5, 5, 0] } : {}}
      transition={{ duration: 0.3 }}
    >
      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{label}</label>
      {description && (
        <p className="text-sm text-text-light mb-2">{description}</p>
      )}
      <textarea
        rows="6"
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        className={`w-full bg-gray-50 border ${error ? 'border-red-500' : 'border-gray-200'} p-3 text-sm focus:border-accent focus:bg-white transition-all outline-none resize-none font-mono`}
        placeholder={placeholder || "Your answer..."}
      ></textarea>
      <div className="flex justify-between items-center mt-1">
        {error ? (
          <p className="text-red-500 text-xs font-mono">{error}</p>
        ) : (
          <div></div>
        )}
        <p className="text-gray-400 text-xs font-mono">
          {value.length} / {maxLength}
        </p>
      </div>
    </motion.div>
  );
};

const FirstYearRepresentativesPage = () => {
  // Application State
  const [currentStep, setCurrentStep] = useState(1);
  const [membershipId, setMembershipId] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  
  const [profile, setProfile] = useState({
    name: '',
    admissionNumber: '',
    department: '',
    semester: '',
    class: '',
    email: '',
    phone: ''
  });

  const [answers, setAnswers] = useState({
    motivation: '',
    teamworkInitiative: '',
    representativeIdea: ''
  });

  const [otpToken, setOtpToken] = useState('');
  
  // UI States
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Animation settings
  const shouldReduceMotion = useReducedMotion();
  const transition = { duration: 0.3, ease: 'easeOut' };
  
  // Fade/slide up config based on reduced motion
  const fadeUpVariant = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
    visible: { opacity: 1, y: 0, transition }
  };
  
  // Stagger wrapper
  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  // Scroll Timeline Setup
  const { scrollYProgress } = useScroll();

  // Initialize from sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('fyr_application_draft');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.currentStep) setCurrentStep(parsed.currentStep);
        if (parsed.profile) setProfile(parsed.profile);
        if (parsed.answers) setAnswers(parsed.answers);
        if (parsed.otpToken) setOtpToken(parsed.otpToken);
      } catch (e) {
        sessionStorage.removeItem('fyr_application_draft');
      }
    }
  }, []);

  // Save to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('fyr_application_draft', JSON.stringify({
      currentStep,
      profile,
      answers,
      otpToken
    }));
  }, [currentStep, profile, answers, otpToken]);

  // --- Handlers ---
  const handleRequestVerification = async (e) => {
    e.preventDefault();
    if (!membershipId.trim() || !email.trim()) {
      return toast.error('Membership ID and Email are required');
    }
    setIsVerifying(true);
    try {
      await requestVerification(membershipId, email);
      setShowOtp(true);
      toast.success('Verification code sent to email');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim()) return toast.error('OTP is required');
    setIsVerifying(true);
    try {
      const data = await verifyOtp(membershipId, email, otp);
      setOtpToken(data.otpToken);
      setProfile(data.profile);
      setCurrentStep(2);
      toast.success('Membership verified');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!profile.name.trim()) newErrors.name = "Required";
    if (!profile.email.trim()) newErrors.email = "Required";
    if (!profile.phone.trim()) newErrors.phone = "Required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors = {};
    if (!answers.motivation.trim() || answers.motivation.length < 30) {
      newErrors.motivation = "Minimum 30 characters required";
    }
    
    // Q2 & Q3 are optional.
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (currentStep === 2 && !validateStep2()) {
      return toast.error('Please fix profile errors');
    }
    if (currentStep === 3 && !validateStep3()) {
      return toast.error('Please answer the mandatory question adequately');
    }
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => setCurrentStep(prev => prev - 1);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await submitApplication(otpToken, profile, answers);
      setCurrentStep(5); // Success step
      sessionStorage.removeItem('fyr_application_draft');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Renderers ---
  const renderStepIndicator = () => {
    const steps = ['01 VERIFY', '02 PROFILE', '03 RESPOND', '04 REVIEW'];
    return (
      <div className="mb-12">
        <div className="flex justify-between items-center relative">
          <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-gray-200 -z-10"></div>
          {steps.map((label, index) => {
            const stepNumber = index + 1;
            const isActive = currentStep === stepNumber;
            const isPast = currentStep > stepNumber;
            return (
              <div key={label} className="flex flex-col items-center bg-white px-2 relative z-10">
                <div className="relative flex justify-center items-center w-3 h-3 mb-2">
                  <div className={`absolute w-3 h-3 rounded-full border-2 transition-colors ${
                    isPast ? 'border-text-dark bg-text-dark' : 'border-gray-200 bg-white'
                  }`}></div>
                  {isActive && (
                    <motion.div 
                      layoutId="activeStepDot"
                      className="absolute w-3 h-3 rounded-full border-2 border-accent bg-accent z-20"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </div>
                <span className={`text-[10px] font-bold font-mono tracking-widest hidden md:block ${
                  isActive ? 'text-accent' : 
                  isPast ? 'text-text-dark' : 'text-gray-400'
                }`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="md:hidden text-center mt-4">
          <span className="text-xs font-bold font-mono tracking-widest text-accent">
            {currentStep < 5 ? steps[currentStep - 1] : '05 COMPLETE'} ({currentStep}/4)
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-bg-main selection:bg-accent selection:text-white pb-20">
      
      {/* HERO SECTION */}
      <section className="bg-text-dark text-white pt-32 pb-16 px-6 relative overflow-hidden">
        {/* Subtle Ambient Background Motion */}
        <motion.div 
          animate={shouldReduceMotion ? {} : { y: [0, 5, 0] }}
          transition={{ duration: 8, ease: "easeInOut", repeat: Infinity }}
          className="absolute inset-0 opacity-10 [background-image:linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] [background-size:40px_40px]"
        ></motion.div>
        
        <motion.div 
          className="max-w-4xl mx-auto relative z-10"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.div variants={fadeUpVariant} className="mb-4 inline-block px-3 py-1 border border-accent text-accent font-mono text-xs font-bold tracking-widest">
            IEDC // 2026
          </motion.div>
          
          {/* Line by line reveal */}
          <div className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-[0.9] mb-6 overflow-hidden">
            <motion.div variants={fadeUpVariant}>CALL FOR</motion.div>
            <motion.div variants={fadeUpVariant} className="text-accent">FIRST-YEAR</motion.div>
            <motion.div variants={fadeUpVariant}>REPRESENTATIVES</motion.div>
          </div>

          <motion.p variants={fadeUpVariant} className="text-gray-300 max-w-xl text-lg mb-8 leading-relaxed font-bold">
            Be the voice of your batch.<br/>
            <span className="text-gray-400 font-normal mt-2 block">Represent. Connect. Lead.</span>
          </motion.p>
          
          <motion.div variants={fadeUpVariant} className="flex flex-col sm:flex-row gap-8 items-start sm:items-center">
            <motion.button 
              whileHover={shouldReduceMotion ? {} : { scale: 1.02, y: -2 }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.96 }}
              onClick={() => document.getElementById('application-flow').scrollIntoView({ behavior: 'smooth' })} 
              className="px-8 py-4 bg-accent text-white font-mono text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-accent transition-colors flex items-center gap-3 shadow-[0_0_15px_rgba(34,197,94,0.15)] hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]"
            >
              Apply Now <FaArrowRight />
            </motion.button>
          </motion.div>
          <motion.div variants={fadeUpVariant} className="mt-12 font-mono text-xs font-bold tracking-widest text-gray-500 uppercase">
            FIRST-YEAR STUDENTS · LBSCEK
          </motion.div>
        </motion.div>
      </section>

      {/* INFORMATION BLOCKS */}
      <section className="py-16 px-6 border-b border-gray-200">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={staggerContainer}
          className="max-w-4xl mx-auto"
        >
          <motion.div variants={fadeUpVariant} className="mb-12">
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-text-dark mb-4">
              Become the voice of your batch.
            </h2>
            <p className="text-text-light max-w-2xl">
              As a representative, you will connect your batch with IEDC activities, communities, and innovation programs. You don't need prior leadership experience—curiosity matters more than experience.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'Get Involved', desc: 'Take part in IEDC activities, workshops and initiatives.' },
              { title: 'Explore', desc: 'Discover innovation, entrepreneurship and new opportunities.' },
              { title: 'Lead', desc: 'Build communication, coordination and leadership skills.' },
              { title: 'Grow', desc: 'Learn, contribute and grow with your community.' }
            ].map((benefit, i) => (
              <motion.div 
                variants={fadeUpVariant}
                whileHover={shouldReduceMotion ? {} : { y: -4, borderColor: '#16a34a' }}
                key={i} 
                className="p-6 bg-white border border-gray-100 transition-colors group"
              >
                <span className="text-3xl font-black text-gray-100 group-hover:text-accent transition-colors">0{i+1}</span>
                <h3 className="mt-4 font-mono text-xs font-bold tracking-widest uppercase text-text-dark mb-2">{benefit.title}</h3>
                <p className="text-sm text-text-light leading-relaxed">{benefit.desc}</p>
              </motion.div>
            ))}
          </div>
          
          <motion.div variants={fadeUpVariant} className="mt-16 pt-16 border-t border-gray-100">
            <h3 className="text-lg font-black uppercase tracking-tighter text-text-dark mb-12 text-center">
              WHAT DOES A REPRESENTATIVE DO?
            </h3>
            
            <div className="max-w-xl mx-auto relative pl-8 border-l-2 border-gray-100 space-y-12 pb-6">
              {/* Animated Progress Line */}
              <motion.div 
                className="absolute left-[-2px] top-0 bottom-0 w-[2px] bg-accent origin-top"
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: false, margin: "-20%" }}
                transition={{ duration: 1, ease: "easeInOut" }}
              />

              {[
                { title: 'CONNECT', desc: 'Keep your batch connected with IEDC.' },
                { title: 'SHARE', desc: 'Spread opportunities, events and initiatives.' },
                { title: 'LISTEN', desc: 'Understand what your batch needs.' },
                { title: 'CONTRIBUTE', desc: 'Bring ideas and students into the IEDC ecosystem.' }
              ].map((role, i) => (
                <motion.div 
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-10%" }}
                  variants={fadeUpVariant}
                  key={i} 
                  className="relative"
                >
                   {/* Node indicator */}
                   <motion.div 
                     initial={{ scale: 0, backgroundColor: '#ffffff', borderColor: '#d1d5db' }}
                     whileInView={{ scale: 1, backgroundColor: '#eab308', borderColor: '#eab308' }}
                     viewport={{ once: true, margin: "-10%" }}
                     transition={{ delay: 0.2 }}
                     className="absolute left-[-41px] top-1.5 w-4 h-4 rounded-full border-2" 
                   />
                   <span className="text-accent font-mono text-xs font-bold mb-1 block">0{i+1}</span>
                   <h4 className="font-black uppercase text-text-dark mb-2 text-xl">{role.title}</h4>
                   <p className="text-base text-text-light">{role.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* APPLICATION FLOW */}
      <section id="application-flow" className="py-16 px-6">
        <div className="max-w-2xl mx-auto">
          
          {currentStep < 5 && renderStepIndicator()}

          <div className="bg-white p-6 md:p-10 border border-gray-200 shadow-sm min-h-[400px] overflow-hidden">
            <AnimatePresence mode="wait">
              
              {/* STEP 1: VERIFY */}
              {currentStep === 1 && (
                <motion.div 
                  key="step1" 
                  initial={{ opacity: 0, x: shouldReduceMotion ? 0 : 30 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, x: shouldReduceMotion ? 0 : -30 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="text-xl font-black uppercase tracking-tighter text-text-dark border-b border-gray-100 pb-4 mb-6">
                    01 // VERIFY YOUR MEMBERSHIP
                  </h3>
                  
                  {!showOtp ? (
                    <form onSubmit={handleRequestVerification} className="space-y-6">
                      <p className="text-sm text-text-light mb-6">
                        Already an IEDC member? Enter your Membership ID and registered email to continue.
                      </p>
                      <InputGroup 
                        label="IEDC Membership ID" 
                        name="membershipId" 
                        value={membershipId} 
                        onChange={e => setMembershipId(e.target.value)} 
                        placeholder="IEDC26IT001" 
                        uppercase
                      />
                      <InputGroup 
                        label="Registered Email" 
                        name="email" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        placeholder="student@email.com" 
                      />
                      <div className="space-y-3">
                        <button type="submit" disabled={isVerifying} className="w-full py-4 bg-text-dark text-white font-mono text-xs font-bold uppercase tracking-widest hover:bg-accent transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
                          {isVerifying ? <FaSpinner className="animate-spin" /> : 'Verify Membership'} <FaArrowRight />
                        </button>
                        <p className="text-[11px] text-gray-400 text-center flex items-center justify-center gap-1.5 font-mono">
                          <FaCheckCircle className="text-accent" />
                          Your membership details are securely verified through the IEDC membership system.
                        </p>
                      </div>

                      <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                        <p className="text-sm text-text-light mb-3">
                          Don't have an IEDC membership yet?
                        </p>
                        <a 
                          href="https://www.iedclbscek.in/register" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex w-full justify-center items-center gap-2 px-6 py-3 border border-gray-200 text-text-dark font-mono text-xs font-bold uppercase tracking-widest hover:border-accent hover:text-accent transition-colors"
                        >
                          Register for Membership
                        </a>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-6">
                      <div className="bg-green-50 border border-green-200 p-4 mb-6 flex items-start gap-3">
                        <FaCheckCircle className="text-green-500 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-green-800">Verification Sent</p>
                          <p className="text-xs text-green-700 mt-1">An OTP has been sent to {email}.</p>
                        </div>
                      </div>
                      <InputGroup 
                        label="6-Digit OTP" 
                        name="otp" 
                        value={otp} 
                        onChange={e => setOtp(e.target.value)} 
                        placeholder="XXXXXX" 
                      />
                      <button type="submit" disabled={isVerifying} className="w-full py-4 bg-accent text-white font-mono text-xs font-bold uppercase tracking-widest hover:bg-text-dark transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
                        {isVerifying ? <FaSpinner className="animate-spin" /> : 'Confirm OTP'} <FaArrowRight />
                      </button>
                    </form>
                  )}
                </motion.div>
              )}

              {/* STEP 2: PROFILE */}
              {currentStep === 2 && (
                <motion.div 
                  key="step2" 
                  initial={{ opacity: 0, x: shouldReduceMotion ? 0 : 30 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, x: shouldReduceMotion ? 0 : -30 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="text-xl font-black uppercase tracking-tighter text-text-dark border-b border-gray-100 pb-4 mb-6">
                    02 // Confirm Details
                  </h3>
                  <p className="text-sm text-text-light mb-6">
                    Please review your profile details. You can update your contact info if necessary.
                  </p>
                  
                  <div className="space-y-4 mb-8">
                    <InputGroup label="Full Name" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} error={errors.name} />
                    <div className="grid grid-cols-2 gap-4">
                      <InputGroup label="Admission No" value={profile.admissionNumber} disabled />
                      <InputGroup label="Department" value={profile.department} disabled />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <InputGroup label="Semester" value={profile.semester} disabled />
                      <InputGroup label="Class (Optional)" value={profile.class} onChange={e => setProfile({...profile, class: e.target.value})} />
                    </div>
                    <InputGroup label="Email" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} error={errors.email} />
                    <InputGroup label="Phone" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} error={errors.phone} />
                  </div>

                  <button onClick={nextStep} className="w-full py-4 bg-text-dark text-white font-mono text-xs font-bold uppercase tracking-widest hover:bg-accent transition-colors flex justify-center items-center gap-2">
                    Looks Good, Continue <FaArrowRight />
                  </button>
                </motion.div>
              )}

              {/* STEP 3: RESPOND */}
              {currentStep === 3 && (
                <motion.div 
                  key="step3" 
                  initial={{ opacity: 0, x: shouldReduceMotion ? 0 : 30 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, x: shouldReduceMotion ? 0 : -30 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="text-xl font-black uppercase tracking-tighter text-text-dark border-b border-gray-100 pb-4 mb-6">
                    03 // Your Voice
                  </h3>
                  <p className="text-sm text-text-light mb-6">
                    Answer the following 3 questions. Minimum 30 characters each.
                  </p>
                  
                  <div className="space-y-8 mb-8">
                    <TextareaGroup 
                      label="Why IEDC?"
                      description="Why do you want to be part of IEDC, and what do you hope to learn or contribute through it?"
                      value={answers.motivation}
                      onChange={e => setAnswers({...answers, motivation: e.target.value})}
                      maxLength={1500}
                      error={errors.motivation}
                    />
                    <TextareaGroup 
                      label="Teamwork / Initiative"
                      description="Tell us about a time when you worked with a team or took initiative to get something done. What was your role, and what did you learn?"
                      value={answers.teamworkInitiative}
                      onChange={e => setAnswers({...answers, teamworkInitiative: e.target.value})}
                      maxLength={1500}
                      error={errors.teamworkInitiative}
                    />
                    <TextareaGroup 
                      label="Representative Mindset"
                      description="Imagine you are an IEDC First-Year Representative. What is one problem or opportunity you notice among first-year students, and what would you do to address it?"
                      value={answers.representativeIdea}
                      onChange={e => setAnswers({...answers, representativeIdea: e.target.value})}
                      maxLength={1500}
                      error={errors.representativeIdea}
                    />
                  </div>

                  <div className="flex gap-4">
                    <button onClick={prevStep} className="py-4 px-6 border border-gray-200 text-gray-500 font-mono text-xs font-bold uppercase tracking-widest hover:bg-gray-50 transition-colors flex justify-center items-center">
                      <FaArrowLeft />
                    </button>
                    <button onClick={nextStep} className="flex-1 py-4 bg-text-dark text-white font-mono text-xs font-bold uppercase tracking-widest hover:bg-accent transition-colors flex justify-center items-center gap-2">
                      Review Application <FaArrowRight />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: REVIEW */}
              {currentStep === 4 && (
                <motion.div 
                  key="step4" 
                  initial={{ opacity: 0, x: shouldReduceMotion ? 0 : 30 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, x: shouldReduceMotion ? 0 : -30 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="text-xl font-black uppercase tracking-tighter text-text-dark border-b border-gray-100 pb-4 mb-6">
                    04 // Review & Submit
                  </h3>
                  
                  <motion.div 
                    className="mb-8 space-y-6"
                    initial="hidden"
                    animate="visible"
                    variants={staggerContainer}
                  >
                    <motion.div variants={fadeUpVariant} className="p-4 bg-gray-50 border border-gray-200">
                      <h4 className="font-mono text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Profile</h4>
                      <p className="text-sm"><strong>Name:</strong> {profile.name}</p>
                      <p className="text-sm"><strong>ID:</strong> {profile.admissionNumber}</p>
                      <p className="text-sm"><strong>Dept:</strong> {profile.department} - {profile.semester}</p>
                      <p className="text-sm"><strong>Contact:</strong> {profile.email} / {profile.phone}</p>
                    </motion.div>

                    <motion.div variants={fadeUpVariant}>
                      <h4 className="font-mono text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Q1. Why IEDC?</h4>
                      <p className="text-sm text-text-light whitespace-pre-wrap p-3 bg-gray-50 border border-gray-100">{answers.motivation}</p>
                    </motion.div>

                    <motion.div variants={fadeUpVariant}>
                      <h4 className="font-mono text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Q2. Teamwork</h4>
                      <p className="text-sm text-text-light whitespace-pre-wrap p-3 bg-gray-50 border border-gray-100">{answers.teamworkInitiative}</p>
                    </motion.div>

                    <motion.div variants={fadeUpVariant}>
                      <h4 className="font-mono text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Q3. Idea</h4>
                      <p className="text-sm text-text-light whitespace-pre-wrap p-3 bg-gray-50 border border-gray-100">{answers.representativeIdea}</p>
                    </motion.div>
                  </motion.div>

                  <div className="flex gap-4">
                    <button disabled={isSubmitting} onClick={prevStep} className="py-4 px-6 border border-gray-200 text-gray-500 font-mono text-xs font-bold uppercase tracking-widest hover:bg-gray-50 transition-colors flex justify-center items-center disabled:opacity-50">
                      <FaArrowLeft />
                    </button>
                    <button 
                      disabled={isSubmitting} 
                      onClick={handleSubmit} 
                      className="relative flex-1 py-4 bg-accent text-white font-mono text-xs font-bold uppercase tracking-widest hover:bg-text-dark transition-colors flex justify-center items-center gap-2 disabled:opacity-50 overflow-hidden"
                    >
                      <AnimatePresence mode="wait">
                        {isSubmitting ? (
                          <motion.div key="submitting" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="flex items-center gap-2">
                            <FaSpinner className="animate-spin" /> SUBMITTING...
                          </motion.div>
                        ) : (
                          <motion.div key="submit" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="flex items-center gap-2">
                            SUBMIT APPLICATION <FaPaperPlane />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 5: SUCCESS */}
              {currentStep === 5 && (
                <motion.div 
                  key="step5" 
                  initial="hidden" 
                  animate="visible" 
                  variants={staggerContainer} 
                  className="text-center py-10"
                >
                  <motion.div variants={fadeUpVariant} className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                    <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <motion.path 
                        initial={{ pathLength: 0 }} 
                        animate={{ pathLength: 1 }} 
                        transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        d="M5 13l4 4L19 7" 
                      />
                    </svg>
                  </motion.div>
                  <motion.h3 variants={fadeUpVariant} className="text-2xl font-black uppercase tracking-tighter text-text-dark mb-4">
                    Application Received
                  </motion.h3>
                  <motion.p variants={fadeUpVariant} className="text-text-light max-w-md mx-auto mb-8">
                    Thank you for putting yourself forward as an IEDC First-Year Representative. The IEDC team will review all applications and contact shortlisted students shortly.
                  </motion.p>
                  <motion.div variants={fadeUpVariant}>
                    <Link to="/" className="inline-flex py-3 px-8 border-2 border-text-dark text-text-dark font-mono text-xs font-bold uppercase tracking-widest hover:bg-text-dark hover:text-white transition-colors">
                      Back to IEDC Base
                    </Link>
                  </motion.div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FirstYearRepresentativesPage;
