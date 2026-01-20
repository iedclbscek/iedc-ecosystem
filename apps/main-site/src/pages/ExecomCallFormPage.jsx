import React, { useState } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const initialForm = {
  membershipId: "",
  q1: "",
  q2: "",
  q3: "",
  motivation: "",
  role: "",
  skills: "",
  experience: "",
  area: "",
  time: "",
  vision: "",
};

const ExecomCallFormPage = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [eligible, setEligible] = useState(null); // null, true, false
  const [error, setError] = useState("");
  const [notEligibleReason, setNotEligibleReason] = useState("");
  const [registration, setRegistration] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [showClosedModal, setShowClosedModal] = useState(true); // Changed from false to true to close the form
  //const [showClosedModal, setShowClosedModal] = useState(false);
  // Step 1: Membership ID input and eligibility check
  const handleNext = async () => {
    setError("");
    if (step === 1) {
      if (!form.membershipId) return setError("Please enter your Membership ID.");
      setLoading(true);
      setEligible(null);
      setRegistration(null);
      setNotEligibleReason("");
      try {
        // First check if membership ID exists and is eligible
        const res = await axios.get(`${API_BASE_URL}/api/registrations/public-lookup`, {
          params: { membershipId: form.membershipId },
          headers: { "Content-Type": "application/json" },
        });
        const found = res.data.data;
        if (!found) {
          setEligible(false);
          setNotEligibleReason("No member found with this Membership ID.");
        } else if (!["1st Semester", "3rd Semester"].includes(found.semester)) {
          setEligible(false);
          setNotEligibleReason("Only S1 & S3 students (1st & 3rd Semester) are eligible for Execom 2025.");
        } else {
          // Check if they've already submitted an Execom Call form
          try {
            const execomCheck = await axios.get(`${API_BASE_URL}/api/registrations/execom-call-check`, {
              params: { membershipId: form.membershipId },
              headers: { "Content-Type": "application/json" },
            });
            if (execomCheck.data.exists) {
              setEligible(false);
              setNotEligibleReason("You have already submitted an Execom Call application. Only one application per member is allowed.");
            } else {
              setEligible(true);
              setRegistration(found);
              setStep(2);
            }
          } catch (execomErr) {
            // If the check endpoint doesn't exist, proceed anyway
            setEligible(true);
            setRegistration(found);
            setStep(2);
          }
        }
      } catch (err) {
        if (err.response && err.response.status === 404) {
          setEligible(false);
          setNotEligibleReason("No member found with this Membership ID.");
        } else {
          setError("Error checking eligibility. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    } else if (step === 2) {
      if (!form.q1) return setError("Please answer question 1.");
      setError("");
      if (form.q1 === "No") setStep(4); // Go to Q3 directly
      else setStep(3); // Show Q2
    } else if (step === 3) {
      if (!form.q2) return setError("Please answer question 2.");
      setError("");
      if (form.q2 === "No") {
        setNotEligibleReason("You must be willing to step down from other positions to be eligible.");
        setEligible(false);
      } else {
        setStep(4);
      }
    } else if (step === 4) {
      if (!form.q3) return setError("Please answer question 3.");
      setError("");
      if (form.q3 === "No") {
        setNotEligibleReason("You must agree to this condition to be eligible for Execom.");
        setEligible(false);
      } else {
        setStep(5);
      }
    } else if (step === 5) {
      // Motivation & Interest
      if (!form.motivation || !form.role || !form.skills) {
        setError("Please answer all questions in this section.");
        return;
      }
      setError("");
      setStep(6);
    } else if (step === 6) {
      // Experience & Commitment
      if (!form.experience || !form.area || !form.time) {
        setError("Please answer all questions in this section.");
        return;
      }
      setError("");
      setStep(7);
    } else if (step === 7) {
      // Vision
      if (!form.vision) {
        setError("Please answer the vision question.");
        return;
      }
      setError("");
      handleSubmit();
    }
  };

  const handleBack = () => {
    setError("");
    if (step === 2) {
      setStep(1);
      setEligible(null);
      setRegistration(null);
      setForm({ ...initialForm, membershipId: form.membershipId });
      setNotEligibleReason("");
    } else if (step === 3) {
      setStep(2);
      setForm((prev) => ({ ...prev, q2: "" }));
      setNotEligibleReason("");
    } else if (step === 4) {
      if (form.q1 === "No") {
        setStep(2);
        setForm((prev) => ({ ...prev, q3: "" }));
      } else {
        setStep(3);
        setForm((prev) => ({ ...prev, q3: "" }));
      }
      setNotEligibleReason("");
    } else if (step === 5) {
      setStep(4);
    } else if (step === 6) {
      setStep(5);
    } else if (step === 7) {
      setStep(6);
    }
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Submit to backend
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError("");
    try {
      await axios.post(`${API_BASE_URL}/api/registrations/execom-call`, form);
      setSubmitSuccess(true);
    } catch (err) {
      setError("Submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render
  return (
    <div className="min-h-screen pt-24 pb-16 px-6 bg-gradient-to-br from-primary/5 to-accent/5">
      {/* Execom Call Closed Modal */}
      {showClosedModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
            <div className="text-center">
              <div className="mb-4">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
                  <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Execom Call Closed
              </h3>
              <p className="text-gray-600 mb-6">
                The IEDC Execom Call for 2025 has been closed. Thank you for your interest!
              </p>
              <p className="text-gray-600 mb-6">
                Interested in becoming part of IEDC? You can still register for membership and participate in our events and activities.
              </p>
              <div className="space-y-3">
                <a
                  href="/register"
                  className="w-full inline-flex justify-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-accent hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-colors"
                >
                  Register for Membership
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-text-dark mb-2">
            IEDC Execom Application
          </h1>
          <p className="text-lg text-text-light max-w-2xl mx-auto">
            Apply for the IEDC Execom. Please enter your Membership ID to begin.
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10 relative">
          {/* Eligibility Criteria Section - Only show on step 1 */}
          {step === 1 && (
            <div className="mb-8 p-6 bg-accent/5 border border-accent/20 rounded-lg">
              <h3 className="text-xl font-semibold text-accent mb-4 flex items-center">
                <span className="mr-2">✅</span>
                Eligibility for IEDC Execom
              </h3>
              <ul className="space-y-2 text-text-dark">
                <li className="flex items-start">
                  <span className="mr-2 mt-1">•</span>
                  <span>Must be a registered IEDC member with a valid Membership ID</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-1">•</span>
                  <span>Open to S1 & S3 students (1st & 3rd Semester)</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-1">•</span>
                  <span>Minimum 7.0 CGPA & No Backlogs</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-1">•</span>
                  <span>Should not hold any position in other clubs/associations within the college</span>
                </li>
              </ul>
            </div>
          )}

          {/* Step 1: Membership ID */}
          {step === 1 && (
            <>
              <label className="block mb-2 font-semibold text-text-dark">Membership ID *</label>
              <input
                type="text"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent transition-all mb-4 disabled:bg-gray-100 disabled:cursor-not-allowed"
                name="membershipId"
                value={form.membershipId}
                onChange={handleInput}
                placeholder="IEDCxxxx..."
                disabled={loading || showClosedModal}
              />
              <div className="mb-4 text-sm text-gray-600">
                Not a registered member? Click{" "}
                <a 
                  href={`/register`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-accent hover:text-accent-dark underline font-medium"
                >
                  here
                </a>{" "}
                to register
              </div>
              <div className="flex justify-end">
                <button
                  className="bg-accent text-white px-6 py-2 rounded-lg font-semibold hover:bg-accent-dark transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
                  onClick={handleNext}
                  disabled={loading || !form.membershipId || showClosedModal}
                >
                  {loading ? "Checking..." : "Next"}
                </button>
              </div>
              {error && <div className="text-red-600 mt-2">{error}</div>}
            </>
          )}
          {/* Not eligible frame (only show once) */}
          {eligible === false && notEligibleReason && (
            <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              <strong>Not Eligible</strong>
              <div>{notEligibleReason}</div>
              <div className="flex justify-end mt-4">
                <button
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-400 transition-all"
                  onClick={() => window.location.reload()}
                >
                  Start Over
                </button>
              </div>
            </div>
          )}
          {/* Step 2: Declaration Q1 */}
          {step === 2 && eligible && (
            <>
              <h3 className="text-xl font-semibold text-text-dark mb-4">Declarations</h3>
              <div className="mb-6">
                <label className="block mb-2">Are you currently holding any position in other college clubs/associations?</label>
                <div className="flex gap-4">
                  <button 
                    className={`px-6 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${form.q1 === "Yes" ? "bg-accent text-white" : "bg-gray-200"}`} 
                    onClick={() => setForm((prev) => ({ ...prev, q1: "Yes" }))}
                    disabled={showClosedModal}
                  >
                    Yes
                  </button>
                  <button 
                    className={`px-6 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${form.q1 === "No" ? "bg-accent text-white" : "bg-gray-200"}`} 
                    onClick={() => setForm((prev) => ({ ...prev, q1: "No" }))}
                    disabled={showClosedModal}
                  >
                    No
                  </button>
                </div>
              </div>
              <div className="flex justify-between">
                <button 
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
                  onClick={handleBack}
                  disabled={showClosedModal}
                >
                  Back
                </button>
                <button 
                  className="bg-accent text-white px-6 py-2 rounded-lg font-semibold hover:bg-accent-dark transition-all disabled:bg-gray-400 disabled:cursor-not-allowed" 
                  onClick={handleNext}
                  disabled={showClosedModal}
                >
                  Next
                </button>
              </div>
              {error && <div className="text-red-600 mt-2">{error}</div>}
            </>
          )}
          {/* Step 3: Declaration Q2 */}
          {step === 3 && eligible && form.q1 === "Yes" && (
            <>
              <div className="mb-6">
                <label className="block mb-2">If yes, are you willing to step down from that position to take up IEDC Execom responsibilities?</label>
                <div className="flex gap-4">
                  <button 
                    className={`px-6 py-2 rounded-lg font-semibold ${form.q2 === "Yes" ? "bg-accent text-white" : "bg-gray-200"} disabled:opacity-50 disabled:cursor-not-allowed`} 
                    onClick={() => setForm((prev) => ({ ...prev, q2: "Yes" }))}
                    disabled={showClosedModal}
                  >
                    Yes
                  </button>
                  <button 
                    className={`px-6 py-2 rounded-lg font-semibold ${form.q2 === "No" ? "bg-accent text-white" : "bg-gray-200"} disabled:opacity-50 disabled:cursor-not-allowed`} 
                    onClick={() => setForm((prev) => ({ ...prev, q2: "No" }))}
                    disabled={showClosedModal}
                  >
                    No
                  </button>
                </div>
              </div>
              <div className="flex justify-between">
                <button className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-400 transition-all" onClick={handleBack}>Back</button>
                <button className="bg-accent text-white px-6 py-2 rounded-lg font-semibold hover:bg-accent-dark transition-all" onClick={handleNext}>Next</button>
              </div>
              {error && <div className="text-red-600 mt-2">{error}</div>}
            </>
          )}
          {/* Step 4: Declaration Q3 */}
          {step === 4 && eligible && ((form.q1 === "No") || (form.q1 === "Yes" && form.q2 === "Yes")) && (
            <>
              <div className="mb-6">
                <label className="block mb-2">Do you agree that if you take up a position in any other club/association during your tenure, you will be removed from IEDC Execom?</label>
                <div className="flex gap-4">
                  <button 
                    className={`px-6 py-2 rounded-lg font-semibold ${form.q3 === "Yes" ? "bg-accent text-white" : "bg-gray-200"} disabled:opacity-50 disabled:cursor-not-allowed`} 
                    onClick={() => setForm((prev) => ({ ...prev, q3: "Yes" }))}
                    disabled={showClosedModal}
                  >
                    Yes
                  </button>
                  <button 
                    className={`px-6 py-2 rounded-lg font-semibold ${form.q3 === "No" ? "bg-accent text-white" : "bg-gray-200"} disabled:opacity-50 disabled:cursor-not-allowed`} 
                    onClick={() => setForm((prev) => ({ ...prev, q3: "No" }))}
                    disabled={showClosedModal}
                  >
                    No
                  </button>
                </div>
              </div>
              <div className="flex justify-between">
                <button 
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
                  onClick={handleBack}
                  disabled={showClosedModal}
                >
                  Back
                </button>
                <button 
                  className="bg-accent text-white px-6 py-2 rounded-lg font-semibold hover:bg-accent-dark transition-all disabled:bg-gray-400 disabled:cursor-not-allowed" 
                  onClick={handleNext}
                  disabled={showClosedModal}
                >
                  Next
                </button>
              </div>
              {error && <div className="text-red-600 mt-2">{error}</div>}
            </>
          )}
          {/* Step 5: Motivation & Interest */}
          {step === 5 && eligible && form.q3 === "Yes" && (
            <>
              <h3 className="text-xl font-semibold text-text-dark mb-4">Motivation & Interest</h3>
              <div className="mb-6">
                <label className="block mb-2">Why do you want to be part of the IEDC Execom?</label>
                <textarea 
                  name="motivation" 
                  value={form.motivation} 
                  onChange={handleInput} 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent transition-all mb-4 disabled:bg-gray-100 disabled:cursor-not-allowed" 
                  rows={2}
                  disabled={showClosedModal}
                />
                <label className="block mb-2">What role do you see yourself playing in driving innovation at LBSCEK?</label>
                <textarea 
                  name="role" 
                  value={form.role} 
                  onChange={handleInput} 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent transition-all mb-4 disabled:bg-gray-100 disabled:cursor-not-allowed" 
                  rows={2}
                  disabled={showClosedModal}
                />
                <label className="block mb-2">Which skills or qualities make you a strong candidate?</label>
                <textarea 
                  name="skills" 
                  value={form.skills} 
                  onChange={handleInput} 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent transition-all mb-4 disabled:bg-gray-100 disabled:cursor-not-allowed" 
                  rows={2}
                  disabled={showClosedModal}
                />
              </div>
              <div className="flex justify-between">
                <button 
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
                  onClick={handleBack}
                  disabled={showClosedModal}
                >
                  Back
                </button>
                <button 
                  className="bg-accent text-white px-6 py-2 rounded-lg font-semibold hover:bg-accent-dark transition-all disabled:bg-gray-400 disabled:cursor-not-allowed" 
                  onClick={handleNext}
                  disabled={showClosedModal}
                >
                  Next
                </button>
              </div>
              {error && <div className="text-red-600 mt-2">{error}</div>}
            </>
          )}
          {/* Step 6: Experience & Commitment */}
          {step === 6 && eligible && form.q3 === "Yes" && (
            <>
              <h3 className="text-xl font-semibold text-text-dark mb-4">Experience & Commitment</h3>
              <div className="mb-6">
                <label className="block mb-2">Have you been part of any events, clubs, or teams (IEDC or others)? Briefly describe.</label>
                <textarea 
                  name="experience" 
                  value={form.experience} 
                  onChange={handleInput} 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent transition-all mb-4 disabled:bg-gray-100 disabled:cursor-not-allowed" 
                  rows={2}
                  disabled={showClosedModal}
                />
                <label className="block mb-2">Which area would you like to contribute most? (Events, Tech, Design, PR, Finance, Content, Documentation, etc.)</label>
                <input 
                  name="area" 
                  value={form.area} 
                  onChange={handleInput} 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent transition-all mb-4 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={showClosedModal}
                />
                <label className="block mb-2">How much time per week can you realistically dedicate to Execom activities?</label>
                <input 
                  name="time" 
                  value={form.time} 
                  onChange={handleInput} 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent transition-all mb-4 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={showClosedModal}
                />
              </div>
              <div className="flex justify-between">
                <button 
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
                  onClick={handleBack}
                  disabled={showClosedModal}
                >
                  Back
                </button>
                <button 
                  className="bg-accent text-white px-6 py-2 rounded-lg font-semibold hover:bg-accent-dark transition-all disabled:bg-gray-400 disabled:cursor-not-allowed" 
                  onClick={handleNext}
                  disabled={showClosedModal}
                >
                  Next
                </button>
              </div>
              {error && <div className="text-red-600 mt-2">{error}</div>}
            </>
          )}
          {/* Step 7: Vision */}
          {step === 7 && eligible && form.q3 === "Yes" && (
            <>
              <h3 className="text-xl font-semibold text-text-dark mb-4">Vision</h3>
              <div className="mb-6">
                <label className="block mb-2">What new initiative or change would you like to introduce through IEDC this year?</label>
                <textarea 
                  name="vision" 
                  value={form.vision} 
                  onChange={handleInput} 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent transition-all mb-4 disabled:bg-gray-100 disabled:cursor-not-allowed" 
                  rows={2}
                  disabled={showClosedModal}
                />
              </div>
              <div className="flex justify-between">
                <button 
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
                  onClick={handleBack}
                  disabled={showClosedModal}
                >
                  Back
                </button>
                <button 
                  className="bg-accent text-white px-6 py-2 rounded-lg font-semibold hover:bg-accent-dark transition-all disabled:bg-gray-400 disabled:cursor-not-allowed" 
                  onClick={handleNext} 
                  disabled={isSubmitting || showClosedModal}
                >
                  {isSubmitting ? "Submitting..." : "Submit"}
                </button>
              </div>
              {error && <div className="text-red-600 mt-2">{error}</div>}
            </>
          )}
          {/* Submission Success */}
          {submitSuccess && (
            <div className="mt-6 p-4 bg-accent/10 border border-accent/20 text-accent rounded text-center">
              <strong>Application Submitted!</strong>
              <div>Thank you for applying for IEDC Execom 2025. We will review your application and contact you soon.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExecomCallFormPage;