import React, { useState, useEffect } from 'react';
import { apiCall, getSessionUser } from './utils/api';
import DashboardCharts from './components/DashboardCharts';
import ComparisonEngine from './components/ComparisonEngine';
import AiChatAssistant from './components/AiChatAssistant';
import ReviewWizard from './components/ReviewWizard';

// Icon SVG helper components to avoid extra npm packages
const SearchIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="input-icon"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
const UserIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
const GlobeIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>;
const StarIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
const CalendarIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
const EyeIcon = () => <svg className="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>;

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  
  // Modals state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  
  // Auth Form state
  const [isAuthTabLogin, setIsAuthTabLogin] = useState(true);
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', isAdmin: false });
  const [authErrors, setAuthErrors] = useState({});

  // Active review edits
  const [editingReview, setEditingReview] = useState(null);

  // Stats / Dashboard metrics
  const [avgRating, setAvgRating] = useState('4.20');
  const [totalReviews, setTotalReviews] = useState(0);
  const [verifiedRatio, setVerifiedRatio] = useState('0%');
  const [positiveSentiment, setPositiveSentiment] = useState('0%');
  const [aiSummary, setAiSummary] = useState(null);
  const [sentimentDistribution, setSentimentDistribution] = useState({ positive: 0, neutral: 0, negative: 0 });

  // Reviews Feed state
  const [reviewsList, setReviewsList] = useState([]);
  const [countriesList, setCountriesList] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeFilters, setActiveFilters] = useState({
    keyword: '',
    rating: '',
    verifiedPurchase: '',
    country: '',
    device: '',
    sort: '-date'
  });

  // Toasts
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 5);
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Synchronize authentication status
  const syncAuth = () => {
    const sessionUser = getSessionUser();
    setUser(sessionUser);
  };

  useEffect(() => {
    syncAuth();
    loadDashboardMetrics();
    loadCountries();
    loadAISummary();
    loadSentimentDistribution();
  }, []);

  // Fetch reviews whenever filters or page changes
  useEffect(() => {
    loadReviewsFeed();
  }, [activeFilters, currentPage]);

  const loadDashboardMetrics = async () => {
    // 1. Avg Rating
    const avgRes = await apiCall('GET', '/stats/average-rating');
    if (avgRes.status === 200 && avgRes.body?.success) {
      setAvgRating(parseFloat(avgRes.body.averageRating || 0).toFixed(2));
    }
    // 2. Verified stats
    const verRes = await apiCall('GET', '/stats/verified-purchases');
    if (verRes.status === 200 && verRes.body?.success) {
      setVerifiedRatio(parseFloat(verRes.body.verifiedPercentage || 0).toFixed(0) + '%');
    }
    // 3. Positive reviews
    const posRes = await apiCall('GET', '/stats/positive-reviews');
    if (posRes.status === 200 && posRes.body?.success) {
      setPositiveSentiment(parseFloat(posRes.body.positivePercentage || 0).toFixed(0) + '%');
    }
  };

  const loadCountries = async () => {
    const res = await apiCall('GET', '/countries');
    if (res.status === 200 && res.body?.success && res.body?.countries) {
      setCountriesList(res.body.countries.filter(Boolean));
    }
  };

  const loadAISummary = async () => {
    const res = await apiCall('GET', '/reviews/ai-summary');
    if (res.status === 200 && res.body?.success) {
      setAiSummary(res.body.summary);
    }
  };

  const loadSentimentDistribution = async () => {
    const res = await apiCall('GET', '/reviews/sentiment-analysis');
    if (res.status === 200 && res.body?.success) {
      const sentiment = res.body.sentiment || {};
      setSentimentDistribution({
        positive: parseFloat(sentiment.positivePercentage || 0).toFixed(0),
        neutral: parseFloat(sentiment.neutralPercentage || 0).toFixed(0),
        negative: parseFloat(sentiment.negativePercentage || 0).toFixed(0)
      });
    }
  };

  const buildReviewsQueryUrl = () => {
    const params = new URLSearchParams();
    params.append('page', currentPage);
    params.append('limit', 5);

    if (activeFilters.sort) params.append('sort', activeFilters.sort);
    if (activeFilters.rating) params.append('rating', activeFilters.rating);
    if (activeFilters.verifiedPurchase) params.append('verifiedPurchase', activeFilters.verifiedPurchase);
    if (activeFilters.country) params.append('country', activeFilters.country);
    if (activeFilters.device) params.append('device', activeFilters.device);
    if (activeFilters.keyword) params.append('titleContains', activeFilters.keyword);

    return `/reviews?${params.toString()}`;
  };

  const loadReviewsFeed = async () => {
    setLoadingFeed(true);
    const url = buildReviewsQueryUrl();
    try {
      const res = await apiCall('GET', url);
      if (res.status === 200 && res.body?.success) {
        setReviewsList(res.body.reviews || []);
        const count = res.body.totalReviews || (res.body.reviews || []).length;
        setTotalReviews(count);
        
        setCurrentPage(res.body.currentPage || 1);
        setTotalPages(res.body.totalPages || 1);
      } else {
        setReviewsList([]);
      }
    } catch (err) {
      console.error(err);
      showToast('API Synchronization Interrupted.', 'error');
    } finally {
      setLoadingFeed(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setActiveFilters(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const removeFilterTag = (field) => {
    handleFilterChange(field, '');
  };

  const clearAllFilters = () => {
    setActiveFilters({
      keyword: '',
      rating: '',
      verifiedPurchase: '',
      country: '',
      device: '',
      sort: '-date'
    });
    setCurrentPage(1);
  };

  // Helpful click vote
  const handleVoteHelpful = (reviewID, e) => {
    const button = e.currentTarget;
    if (button.classList.contains('active')) {
      showToast('You already voted this review helpful.', 'info');
      return;
    }
    button.classList.add('active');
    
    // Optimistic UI updates
    setReviewsList(prev => 
      prev.map(r => r.reviewID === reviewID ? { ...r, helpful: (r.helpful || 0) + 1 } : r)
    );
    showToast('Helpful vote recorded! Thank you for the feedback.', 'success');
  };

  // Auth Operations
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (isAuthTabLogin) {
      if (!authForm.email || !authForm.email.includes('@')) {
        newErrors.email = 'Please provide a valid email.';
      }
      if (!authForm.password) {
        newErrors.password = 'Please provide your password.';
      }

      if (Object.keys(newErrors).length > 0) {
        setAuthErrors(newErrors);
        return;
      }

      const res = await apiCall('POST', '/auth/login', {
        email: authForm.email.trim(),
        password: authForm.password
      });

      if (res.status === 200 && res.body?.accessToken) {
        localStorage.setItem('metaLens_accessToken', res.body.accessToken);
        localStorage.setItem('metaLens_refreshToken', res.body.refreshToken);
        syncAuth();
        setAuthOpen(false);
        setAuthForm({ name: '', email: '', password: '', isAdmin: false });
        showToast('Successfully logged in!', 'success');
        loadReviewsFeed(); // Refresh feeds to load admin actions if admin
      } else {
        setAuthErrors({ api: res.body?.message || 'Invalid email or password combination.' });
      }
    } else {
      if (!authForm.name.trim()) {
        newErrors.name = 'Full name is required.';
      }
      if (!authForm.email || !authForm.email.includes('@')) {
        newErrors.email = 'Please provide a valid email address.';
      }
      if (!authForm.password || authForm.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters long.';
      }

      if (Object.keys(newErrors).length > 0) {
        setAuthErrors(newErrors);
        return;
      }

      const res = await apiCall('POST', '/auth/register', {
        name: authForm.name.trim(),
        email: authForm.email.trim(),
        password: authForm.password,
        role: authForm.isAdmin ? 'admin' : 'user'
      });

      if (res.status === 201) {
        showToast('Account initialized successfully! You can sign in now.', 'success');
        setIsAuthTabLogin(true);
        setAuthErrors({});
      } else {
        setAuthErrors({ api: res.body?.message || 'Strong password check failed or email already active.' });
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('metaLens_accessToken');
    localStorage.removeItem('metaLens_refreshToken');
    localStorage.removeItem('metaLens_user');
    setUser(null);
    showToast('Logged out cleanly.', 'info');
    loadReviewsFeed();
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('WARNING: Are you absolutely sure you want to permanently delete your account? This will wipe your credentials from MongoDB.')) {
      return;
    }

    const res = await apiCall('DELETE', '/auth/account');
    if (res.status === 200) {
      localStorage.removeItem('metaLens_accessToken');
      localStorage.removeItem('metaLens_refreshToken');
      localStorage.removeItem('metaLens_user');
      setUser(null);
      setProfileOpen(false);
      showToast('Account deleted successfully.', 'info');
      loadReviewsFeed();
    } else {
      showToast(res.body?.message || 'Failed to delete account.', 'error');
    }
  };

  // Forgot password simulation
  const handleForgotPasswordSim = async () => {
    if (!authForm.email) {
      showToast('Please enter your account email first.', 'error');
      return;
    }

    const res = await apiCall('POST', '/auth/forgot-password', { email: authForm.email.trim() });
    if (res.status === 200 && res.body?.resetToken) {
      alert(`[SIMULATION] Verification reset code dispatched: ${res.body.resetToken}`);
      const code = prompt('Enter the dispatch verification reset code to reset password:');
      if (!code) return;

      const newPass = prompt('Enter secure new password:');
      if (!newPass) return;

      const resetRes = await apiCall('POST', '/auth/reset-password', {
        email: authForm.email.trim(),
        token: code,
        newPassword: newPass
      });

      if (resetRes.status === 200) {
        showToast('Password reset successfully! Log in now.', 'success');
      } else {
        showToast(resetRes.body?.message || 'Failed to complete reset.', 'error');
      }
    } else {
      showToast('Account email not found in database registry.', 'error');
    }
  };

  // Admin Operations
  const handleTriggerDeleteReview = async (reviewID) => {
    if (!window.confirm(`Are you absolutely sure you want to permanently delete review ${reviewID}? This action cannot be undone.`)) {
      return;
    }

    const res = await apiCall('DELETE', `/reviews/${reviewID}`);
    if (res.status === 200) {
      showToast(`Review ${reviewID} deleted successfully!`, 'success');
      loadReviewsFeed();
      loadDashboardMetrics();
      loadSentimentDistribution();
    } else {
      showToast(res.body?.message || 'Failed to delete review.', 'error');
    }
  };

  const handlePromptEditRating = async (reviewID, currentRating) => {
    const newRatingStr = prompt(`Enter new rating (1.0 to 5.0) for review ${reviewID}:`, currentRating);
    if (newRatingStr === null) return;
    
    const newRating = parseFloat(newRatingStr);
    if (isNaN(newRating) || newRating < 1.0 || newRating > 5.0) {
      showToast('Invalid rating input. Must be between 1.0 and 5.0.', 'error');
      return;
    }

    const res = await apiCall('PATCH', `/reviews/${reviewID}/rating`, { rating: newRating });
    if (res.status === 200) {
      showToast(`Rating for ${reviewID} updated to ${newRating}!`, 'success');
      loadReviewsFeed();
      loadDashboardMetrics();
      loadSentimentDistribution();
    } else {
      showToast(res.body?.message || 'Failed to patch rating.', 'error');
    }
  };

  const handleOpenEditWizard = (review) => {
    setEditingReview(review);
    setWizardOpen(true);
  };

  const handleWizardSuccess = (message) => {
    showToast(message, 'success');
    loadReviewsFeed();
    loadDashboardMetrics();
    loadSentimentDistribution();
  };

  // Render Stars helper
  const renderStars = (rating) => {
    let stars = '';
    const rounded = Math.round(rating);
    for (let i = 1; i <= 5; i++) {
      stars += i <= rounded ? '★' : '☆';
    }
    return stars;
  };

  return (
    <div>
      {/* Background Glow Elements */}
      <div className="bg-glow bg-glow-1"></div>
      <div className="bg-glow bg-glow-2"></div>

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span>{toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}</span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="app-header">
        <div className="header-container">
          <div className="logo" onClick={() => setActiveTab('dashboard')}>
            <EyeIcon />
            <span>MetaLens<span className="gradient-text">Reviews</span></span>
          </div>

          <nav className="header-nav">
            <button
              className={`nav-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              Dashboard
            </button>
            <button
              className={`nav-tab-btn ${activeTab === 'feed' ? 'active' : ''}`}
              onClick={() => setActiveTab('feed')}
            >
              Review Feed
            </button>
            <button
              className={`nav-tab-btn ${activeTab === 'comparison' ? 'active' : ''}`}
              onClick={() => setActiveTab('comparison')}
            >
              Model Compare
            </button>
            <button
              className={`nav-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              AI Assistant
            </button>
          </nav>

          <div className="header-actions">
            {user?.role === 'admin' && (
              <div className="admin-badge">
                <span className="badge-dot"></span> Admin Active
              </div>
            )}

            {!user ? (
              <button className="btn btn-secondary btn-icon" onClick={() => setAuthOpen(true)}>
                <span>Sign In / Join</span>
              </button>
            ) : (
              <div className="user-menu">
                <span className="user-greeting">Hi, <strong>{user.name || 'User'}</strong></span>
                <button className="btn btn-secondary btn-small" onClick={() => setProfileOpen(true)}>Profile</button>
                <button className="btn btn-danger btn-small" onClick={handleLogout}>Logout</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="app-content">
        
        {/* TABS CONTAINER */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Top Metrics Row */}
            <section className="metrics-grid">
              <div className="metric-card">
                <div className="metric-icon-wrap bg-cyan-glow">
                  <StarIcon />
                </div>
                <div className="metric-data">
                  <span className="metric-label">Average Rating</span>
                  <h2 className="metric-value">{avgRating}</h2>
                  <div className="star-rating-display">{renderStars(parseFloat(avgRating))}</div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon-wrap bg-purple-glow">
                  <GlobeIcon />
                </div>
                <div className="metric-data">
                  <span className="metric-label">Total Reviews</span>
                  <h2 className="metric-value">{totalReviews}</h2>
                  <span className="metric-sub">Seeded DB Records</span>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon-wrap bg-emerald-glow">
                  <UserIcon />
                </div>
                <div className="metric-data">
                  <span className="metric-label">Verified Purchase</span>
                  <h2 className="metric-value">{verifiedRatio}</h2>
                  <div className="progress-bar-container">
                    <div className="progress-bar" style={{ width: verifiedRatio }}></div>
                  </div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon-wrap bg-rose-glow">
                  <CalendarIcon />
                </div>
                <div className="metric-data">
                  <span className="metric-label">Positive Sentiment</span>
                  <h2 className="metric-value">{positiveSentiment}</h2>
                  <span className="metric-sub">4.0+ Star Ratings</span>
                </div>
              </div>
            </section>

            {/* Charts Panel */}
            <DashboardCharts />

            {/* Split layout: AI Synthesis & Sentiment Breakdown */}
            <div className="dashboard-layout">
              {/* Left Column: Sentiment Distribution */}
              <div className="glass-panel">
                <h3 className="panel-title">Sentiment Distribution</h3>
                <div className="sentiment-row">
                  <div className="sentiment-label-row">
                    <span>Positive (4-5 ★)</span>
                    <span className="sentiment-value" style={{ color: 'var(--emerald-primary)' }}>
                      {sentimentDistribution.positive}%
                    </span>
                  </div>
                  <div className="sentiment-bar-bg">
                    <div className="sentiment-bar-fill bar-positive" style={{ width: `${sentimentDistribution.positive}%` }}></div>
                  </div>
                </div>

                <div className="sentiment-row" style={{ marginTop: '16px' }}>
                  <div className="sentiment-label-row">
                    <span>Neutral (3 ★)</span>
                    <span className="sentiment-value" style={{ color: 'var(--amber-primary)' }}>
                      {sentimentDistribution.neutral}%
                    </span>
                  </div>
                  <div className="sentiment-bar-bg">
                    <div className="sentiment-bar-fill bar-neutral" style={{ width: `${sentimentDistribution.neutral}%` }}></div>
                  </div>
                </div>

                <div className="sentiment-row" style={{ marginTop: '16px' }}>
                  <div className="sentiment-label-row">
                    <span>Negative (1-2 ★)</span>
                    <span className="sentiment-value" style={{ color: 'var(--rose-primary)' }}>
                      {sentimentDistribution.negative}%
                    </span>
                  </div>
                  <div className="sentiment-bar-bg">
                    <div className="sentiment-bar-fill bar-negative" style={{ width: `${sentimentDistribution.negative}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Right Column: AI Copilot Synthesis */}
              <div className="glass-panel">
                <div className="ai-header">
                  <div className="ai-icon">✨</div>
                  <h3 className="panel-title" style={{ border: 'none', padding: 0, margin: 0 }}>
                    AI Copilot Review Synthesis
                  </h3>
                </div>

                {aiSummary ? (
                  <div className="ai-synth-box">
                    <p className="ai-verdict">
                      <strong>Summary Verdict:</strong> {aiSummary.verdict || 'No verdict generated yet.'}
                    </p>
                    <div className="ai-list-wrap">
                      <h4 className="ai-list-title ai-pros-title">Top Pros Highlighted</h4>
                      <div className="ai-pills">
                        {(aiSummary.pros || []).map((pro, idx) => (
                          <span key={idx} className="ai-pill ai-pill-pro"># {pro}</span>
                        ))}
                      </div>
                    </div>
                    <div className="ai-list-wrap" style={{ marginTop: '14px' }}>
                      <h4 className="ai-list-title ai-cons-title">Primary Concerns</h4>
                      <div className="ai-pills">
                        {(aiSummary.cons || []).map((con, idx) => (
                          <span key={idx} className="ai-pill ai-pill-con"># {con}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="pulse-loader">
                    <span></span><span></span><span></span>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {activeTab === 'feed' && (
          <div className="dashboard-layout">
            
            {/* Left Column: Filter Sidebar */}
            <aside className="dashboard-sidebar">
              <div className="glass-panel">
                <h3 className="panel-title">Filter Matrix</h3>

                <div className="form-group">
                  <label htmlFor="searchQuery">Search Reviews</label>
                  <div className="input-with-icon">
                    <SearchIcon />
                    <input
                      type="text"
                      id="searchQuery"
                      placeholder="Search keywords, titles..."
                      value={activeFilters.keyword}
                      onChange={(e) => handleFilterChange('keyword', e.target.value)}
                    />
                  </div>
                </div>

                <div className="filter-row">
                  <div className="form-group half-width">
                    <label htmlFor="ratingFilter">Rating</label>
                    <select
                      id="ratingFilter"
                      value={activeFilters.rating}
                      onChange={(e) => handleFilterChange('rating', e.target.value)}
                    >
                      <option value="">All Ratings</option>
                      <option value="5">5 Stars only</option>
                      <option value="4">4 Stars & up</option>
                      <option value="3">3 Stars & up</option>
                      <option value="2">2 Stars & up</option>
                      <option value="1">1 Star & up</option>
                    </select>
                  </div>

                  <div className="form-group half-width">
                    <label htmlFor="verifiedFilter">Purchase</label>
                    <select
                      id="verifiedFilter"
                      value={activeFilters.verifiedPurchase}
                      onChange={(e) => handleFilterChange('verifiedPurchase', e.target.value)}
                    >
                      <option value="">All Purchases</option>
                      <option value="true">Verified only</option>
                      <option value="false">Unverified only</option>
                    </select>
                  </div>
                </div>

                <div className="filter-row">
                  <div className="form-group half-width">
                    <label htmlFor="countryFilter">Country</label>
                    <select
                      id="countryFilter"
                      value={activeFilters.country}
                      onChange={(e) => handleFilterChange('country', e.target.value)}
                    >
                      <option value="">All Countries</option>
                      {countriesList.map((c, i) => (
                        <option key={i} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group half-width">
                    <label htmlFor="deviceFilter">Device</label>
                    <select
                      id="deviceFilter"
                      value={activeFilters.device}
                      onChange={(e) => handleFilterChange('device', e.target.value)}
                    >
                      <option value="">All Devices</option>
                      <option value="Wayfarer">Wayfarer</option>
                      <option value="Headliner">Headliner</option>
                    </select>
                  </div>
                </div>

                <button className="btn btn-secondary btn-full" onClick={clearAllFilters}>
                  Reset Filters
                </button>
              </div>
            </aside>

            {/* Right Column: Review Feed */}
            <section className="reviews-feed">
              <div className="feed-header">
                <div className="feed-info">
                  <h3 className="feed-title">Glasses Review Feed</h3>
                  <span className="feed-count">
                    Showing {reviewsList.length} of {totalReviews} reviews
                  </span>
                </div>

                <div className="feed-actions">
                  <div className="sort-selector">
                    <label htmlFor="sortBySelect">Sort:</label>
                    <select
                      id="sortBySelect"
                      value={activeFilters.sort}
                      onChange={(e) => handleFilterChange('sort', e.target.value)}
                    >
                      <option value="-date">Latest first</option>
                      <option value="date">Oldest first</option>
                      <option value="-rating">Highest rated</option>
                      <option value="rating">Lowest rated</option>
                      <option value="-helpful">Most helpful</option>
                    </select>
                  </div>

                  <button className="btn btn-primary" onClick={() => { setEditingReview(null); setWizardOpen(true); }}>
                    Write Review
                  </button>
                </div>
              </div>

              {/* Active Filter Chips */}
              {(activeFilters.keyword || activeFilters.rating || activeFilters.verifiedPurchase || activeFilters.country || activeFilters.device) && (
                <div className="active-tags">
                  {activeFilters.keyword && (
                    <span className="active-tag">
                      Search: "{activeFilters.keyword}"
                      <span className="active-tag-close" onClick={() => removeFilterTag('keyword')}>×</span>
                    </span>
                  )}
                  {activeFilters.rating && (
                    <span className="active-tag">
                      {activeFilters.rating} Stars & up
                      <span className="active-tag-close" onClick={() => removeFilterTag('rating')}>×</span>
                    </span>
                  )}
                  {activeFilters.verifiedPurchase && (
                    <span className="active-tag">
                      {activeFilters.verifiedPurchase === 'true' ? 'Verified Only' : 'Unverified Only'}
                      <span className="active-tag-close" onClick={() => removeFilterTag('verifiedPurchase')}>×</span>
                    </span>
                  )}
                  {activeFilters.country && (
                    <span className="active-tag">
                      Country: {activeFilters.country}
                      <span className="active-tag-close" onClick={() => removeFilterTag('country')}>×</span>
                    </span>
                  )}
                  {activeFilters.device && (
                    <span className="active-tag">
                      Device: {activeFilters.device}
                      <span className="active-tag-close" onClick={() => removeFilterTag('device')}>×</span>
                    </span>
                  )}
                </div>
              )}

              {/* Grid of Reviews */}
              {loadingFeed ? (
                <div className="reviews-grid">
                  <div className="card-skeleton"></div>
                  <div className="card-skeleton"></div>
                </div>
              ) : reviewsList.length === 0 ? (
                <div className="glass-panel text-center font-muted" style={{ padding: '48px' }}>
                  <p style={{ fontSize: '18px', marginBottom: '8px' }}>No matching Meta Glasses reviews found.</p>
                  <p style={{ fontSize: '13px' }}>Try adjusting your query matrix parameters or add a new record.</p>
                </div>
              ) : (
                <div className="reviews-grid">
                  {reviewsList.map((review) => {
                    const initials = review.name
                      ? review.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
                      : 'U';
                    const dateStr = review.date
                      ? new Date(review.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                      : 'Recent Date';
                    
                    return (
                      <article key={review.reviewID} className="review-card animate-fade-in">
                        <div className="card-top">
                          <div className="reviewer-meta">
                            <div className="reviewer-avatar">{initials}</div>
                            <div className="reviewer-info">
                              <span className="reviewer-name">{review.name || 'Anonymous User'}</span>
                              <span className="review-location-date">{review.country || 'Global'} • {dateStr}</span>
                            </div>
                          </div>

                          <div className="card-badges">
                            <span className={`verified-badge ${review.verifiedPurchase ? 'verified-true' : 'verified-false'}`}>
                              {review.verifiedPurchase ? '✓ Verified Purchase' : 'Unverified User'}
                            </span>
                            <span className={`sentiment-badge ${review.rating >= 4 ? 'sentiment-positive' : 'sentiment-negative'}`}>
                              {review.rating >= 4 ? 'Positive' : 'Negative'}
                            </span>
                          </div>
                        </div>

                        <div className="card-body">
                          <div className="star-rating-display" style={{ fontSize: '15px' }}>
                            {renderStars(review.rating)}
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '4px' }}>
                              ({review.rating})
                            </span>
                          </div>
                          <h4 className="review-card-title">{review.title}</h4>
                          <p className="review-card-text">{review.review}</p>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Device: <strong style={{ color: 'var(--cyan-light)' }}>{review.device || 'Smart Shades'}</strong> | ID: <code>{review.reviewID}</code>
                          </div>
                        </div>

                        <div className="card-bottom">
                          <div className="helpful-votes">
                            <button className="btn-helpful" onClick={(e) => handleVoteHelpful(review.reviewID, e)}>
                              👍 Helpful
                            </button>
                            <span className="helpful-count-val">{review.helpful || 0} voters found this helpful</span>
                          </div>

                          {user?.role === 'admin' && (
                            <div className="admin-actions">
                              <button
                                className="btn-admin-action"
                                onClick={() => handleOpenEditWizard(review)}
                                title="Edit Review Content"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                className="btn-admin-action"
                                onClick={() => handlePromptEditRating(review.reviewID, review.rating)}
                                title="Edit Rating Number"
                              >
                                ⭐ Rating
                              </button>
                              <button
                                className="btn-admin-action btn-admin-delete"
                                onClick={() => handleTriggerDeleteReview(review.reviewID)}
                                title="Delete Review Record"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {/* Pagination Info */}
              {totalPages > 1 && (
                <div className="pagination-container">
                  <button
                    className="btn btn-secondary btn-icon"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage <= 1}
                  >
                    <span>Previous</span>
                  </button>
                  <span className="pagination-info">Page {currentPage} of {totalPages}</span>
                  <button
                    className="btn btn-secondary btn-icon"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    <span>Next</span>
                  </button>
                </div>
              )}

            </section>
          </div>
        )}

        {activeTab === 'comparison' && <ComparisonEngine />}

        {activeTab === 'chat' && <AiChatAssistant />}

      </main>

      {/* REVIEW WIZARD MODAL */}
      <ReviewWizard
        isOpen={wizardOpen}
        onClose={() => { setWizardOpen(false); setEditingReview(null); }}
        onSuccess={handleWizardSuccess}
        initialData={editingReview}
      />

      {/* AUTH DIALOG MODAL */}
      {authOpen && (
        <div className="modal-overlay">
          <div className="glass-modal auth-modal">
            <button className="modal-close" onClick={() => setAuthOpen(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div className="auth-tabs">
              <button
                className={`auth-tab-btn ${isAuthTabLogin ? 'active' : ''}`}
                onClick={() => { setIsAuthTabLogin(true); setAuthErrors({}); }}
              >
                Sign In
              </button>
              <button
                className={`auth-tab-btn ${!isAuthTabLogin ? 'active' : ''}`}
                onClick={() => { setIsAuthTabLogin(false); setAuthErrors({}); }}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} noValidate>
              {authErrors.api && (
                <div className="form-group invalid">
                  <span className="error-msg" style={{ display: 'block' }}>⚠️ {authErrors.api}</span>
                </div>
              )}

              {!isAuthTabLogin && (
                <div className={`form-group ${authErrors.name ? 'invalid' : ''}`}>
                  <label htmlFor="authName">Full Name</label>
                  <input
                    type="text"
                    id="authName"
                    placeholder="e.g. Harshit Pandya"
                    value={authForm.name}
                    onChange={(e) => setAuthForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <span className="error-msg">{authErrors.name}</span>
                </div>
              )}

              <div className={`form-group ${authErrors.email ? 'invalid' : ''}`}>
                <label htmlFor="authEmail">Email Address</label>
                <input
                  type="email"
                  id="authEmail"
                  placeholder="e.g. harshit@test.com"
                  value={authForm.email}
                  onChange={(e) => setAuthForm(prev => ({ ...prev, email: e.target.value }))}
                />
                <span className="error-msg">{authErrors.email}</span>
              </div>

              <div className={`form-group ${authErrors.password ? 'invalid' : ''}`}>
                <label htmlFor="authPassword">Password</label>
                <input
                  type="password"
                  id="authPassword"
                  placeholder="••••••••"
                  value={authForm.password}
                  onChange={(e) => setAuthForm(prev => ({ ...prev, password: e.target.value }))}
                />
                <span className="error-msg">{authErrors.password}</span>
                {!isAuthTabLogin && (
                  <div className="form-help">Must be 8+ characters.</div>
                )}
              </div>

              {!isAuthTabLogin && (
                <div className="form-group">
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      id="authIsAdmin"
                      checked={authForm.isAdmin}
                      onChange={(e) => setAuthForm(prev => ({ ...prev, isAdmin: e.target.checked }))}
                    />
                    <span className="checkmark"></span>
                    Register with Administrative Privileges
                  </label>
                </div>
              )}

              {isAuthTabLogin && (
                <div className="auth-helper-row" style={{ textAlign: 'right' }}>
                  <button type="button" className="link-btn" onClick={handleForgotPasswordSim}>
                    Forgot Password?
                  </button>
                </div>
              )}

              <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '16px' }}>
                <span>{isAuthTabLogin ? 'Sign In Securely' : 'Initialize Account'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* USER PROFILE MODAL */}
      {profileOpen && user && (
        <div className="modal-overlay">
          <div className="glass-modal">
            <button className="modal-close" onClick={() => setProfileOpen(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div className="modal-header">
              <h3 className="modal-title">Your Profile & Session</h3>
              <p className="modal-subtitle">Details retrieved from JWT Authorization Profile.</p>
            </div>

            <div className="profile-details-content">
              <div className="profile-avatar-row">
                <div className="profile-avatar">👤</div>
                <div className="profile-meta">
                  <h4>{user.name || 'User'}</h4>
                  <span
                    className="role-chip"
                    style={{
                      background: user.role === 'admin' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                      borderColor: user.role === 'admin' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(6, 182, 212, 0.3)',
                      color: user.role === 'admin' ? 'var(--amber-primary)' : 'var(--cyan-primary)'
                    }}
                  >
                    {user.role || 'user'}
                  </span>
                </div>
              </div>

              <div className="profile-fields">
                <div className="profile-field-row">
                  <span className="profile-field-label">Email:</span>
                  <span className="profile-field-value">{user.email || 'N/A'}</span>
                </div>
                <div className="profile-field-row">
                  <span className="profile-field-label">Account Type:</span>
                  <span className="profile-field-value">
                    {user.role === 'admin' ? 'Administrative Account' : 'Standard Verified Account'}
                  </span>
                </div>
              </div>

              <div className="profile-actions-danger">
                <h5>Danger Zone</h5>
                <p className="form-help" style={{ marginBottom: '12px' }}>
                  Permanently delete your profile and auth credentials from the MongoDB database registry.
                </p>
                <button className="btn btn-danger btn-full" onClick={handleDeleteAccount}>
                  Permanently Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
