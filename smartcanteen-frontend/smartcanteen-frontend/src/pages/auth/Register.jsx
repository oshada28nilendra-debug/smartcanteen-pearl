import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Register = () => {
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    role: 'student', studentId: '', businessName: '',
    description: '', contactPhone: '',
  });
  const [error, setError]                 = useState('');
  const [success, setSuccess]             = useState('');
  const [loading, setLoading]             = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const { register }                      = useAuth();
  const navigate                          = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Secret code typed in Student ID field unlocks admin option
    if (name === 'studentId' && value === 'PEARL-ADMIN') {
      setAdminUnlocked(true);
    }
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.password !== form.confirmPassword) {
      return setError('Passwords do not match.');
    }

    setLoading(true);
    try {
      const data = {
        name:     form.name,
        email:    form.email,
        password: form.password,
        role:     form.role,
      };
      if (form.role === 'student' && form.studentId) {
        data.studentId = form.studentId;
      }
      if (form.role === 'vendor') {
        data.businessName = form.businessName;
        data.description  = form.description;
        data.contactPhone = form.contactPhone;
      }
      if (form.role === 'admin') {
        data.secretCode = 'PEARL-ADMIN'; // ← sends secret to backend
      }

      const res = await register(data);
      setSuccess(res.message);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
      if (err.response?.data?.errors) {
        const msgs = err.response.data.errors.map((e) => e.message).join(', ');
        setError(msgs);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">

        {/* Logo */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-black text-slate-800">
            PEARL<span className="text-blue-500">.</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Smart Canteen Pre-Ordering</p>
        </div>

        <h2 className="text-2xl font-bold text-slate-800 mb-4 text-center">Create account</h2>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-600 rounded-xl p-3 mb-4 text-sm">
            {success} Redirecting to login...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Role selector */}
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">I am a</label>
            <div className={`grid gap-3 ${adminUnlocked ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <button
                type="button"
                onClick={() => setForm({ ...form, role: 'student' })}
                className={`py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                  form.role === 'student'
                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                    : 'border-slate-200 text-slate-500'
                }`}
              >
                🎓 Student
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, role: 'vendor' })}
                className={`py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                  form.role === 'vendor'
                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                    : 'border-slate-200 text-slate-500'
                }`}
              >
                🏪 Vendor
              </button>

              {/* Hidden admin button — only appears after secret code */}
              {adminUnlocked && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, role: 'admin' })}
                  className={`py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                    form.role === 'admin'
                      ? 'border-purple-500 bg-purple-50 text-purple-600'
                      : 'border-slate-200 text-slate-500'
                  }`}
                >
                  👑 Admin
                </button>
              )}
            </div>

            {/* Admin unlocked badge */}
            {adminUnlocked && (
              <div className="mt-2 bg-purple-50 border border-purple-200 text-purple-600 rounded-xl p-2 text-xs text-center">
                👑 Admin mode unlocked
              </div>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">Full Name</label>
            <input
              type="text" name="name" value={form.name}
              onChange={handleChange} placeholder="Your full name" required
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">Email Address</label>
            <input
              type="email" name="email" value={form.email}
              onChange={handleChange} placeholder="you@example.com" required
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Student ID — only for students */}
          {form.role === 'student' && (
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">
                Student ID <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text" name="studentId" value={form.studentId}
                onChange={handleChange} placeholder="e.g. STU001"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          )}

          {/* Vendor fields */}
          {form.role === 'vendor' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Business Name</label>
                <input
                  type="text" name="businessName" value={form.businessName}
                  onChange={handleChange} placeholder="Your canteen name" required
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Description</label>
                <input
                  type="text" name="description" value={form.description}
                  onChange={handleChange} placeholder="Brief description of your canteen"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Contact Phone</label>
                <input
                  type="text" name="contactPhone" value={form.contactPhone}
                  onChange={handleChange} placeholder="077XXXXXXX"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm text-orange-600">
                ⚠️ Your account will be <strong>pending approval</strong> until an admin activates it.
              </div>
            </>
          )}

          {/* Admin notice */}
          {form.role === 'admin' && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-sm text-purple-600">
              👑 You are registering as <strong>Super Admin</strong>. Full dashboard access will be granted.
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">Password</label>
            <input
              type="password" name="password" value={form.password}
              onChange={handleChange} placeholder="Min 8 chars, uppercase, number, symbol" required
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">Confirm Password</label>
            <input
              type="password" name="confirmPassword" value={form.confirmPassword}
              onChange={handleChange} placeholder="Repeat your password" required
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            type="submit" disabled={loading}
            className={`w-full text-white font-semibold rounded-xl py-3 text-sm transition-all duration-200 disabled:opacity-60 ${
              form.role === 'admin'
                ? 'bg-purple-500 hover:bg-purple-600'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-500 font-semibold hover:underline">
            Sign in
          </Link>
        </div>

      </div>
    </div>
  );
};

export default Register;