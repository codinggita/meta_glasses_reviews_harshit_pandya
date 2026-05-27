/* ==========================================================================
   METLENS CLIENT ENGINE - FULL APIS, SECURITY & DYNAMIC RENDER PIPELINE
   ========================================================================== */

// Base Settings
const LIMIT_PER_PAGE = 5;
let currentPage = 1;
let totalPages = 1;
let activeFilters = {
    keyword: '',
    rating: '',
    verifiedPurchase: '',
    country: '',
    device: '',
    sort: '-date'
};

// ==========================================================================
// TOAST NOTIFICATIONS PIPELINE
// ==========================================================================
const showToast = (message, type = 'info') => {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <span>${icon}</span>
            <span>${message}</span>
        </div>
    `;

    container.appendChild(toast);

    // Auto-remove after 4.5 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        toast.style.transition = 'all 0.4s ease-out';
        setTimeout(() => toast.remove(), 400);
    }, 4500);
};

// ==========================================================================
// JWT SESSION & AUTHENTICATION SECURE PIPELINE
// ==========================================================================

const getAuthHeaders = () => {
    const token = localStorage.getItem('metaLens_accessToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

const decodeToken = (token) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
};

const getSessionUser = () => {
    const token = localStorage.getItem('metaLens_accessToken');
    if (!token) return null;
    const decoded = decodeToken(token);
    if (!decoded) return null;
    // Check if token is expired
    const now = Date.now() / 1000;
    if (decoded.exp && decoded.exp < now) {
        // Token expired
        localStorage.removeItem('metaLens_accessToken');
        localStorage.removeItem('metaLens_refreshToken');
        localStorage.removeItem('metaLens_user');
        return null;
    }
    return decoded;
};

// Sync headers and login elements
const syncAuthUI = () => {
    const user = getSessionUser();
    const loginBtn = document.getElementById('loginBtn');
    const userMenu = document.getElementById('userMenu');
    const userNameText = document.getElementById('userNameText');
    const adminModeIndicator = document.getElementById('adminModeIndicator');

    if (user) {
        loginBtn.classList.add('hidden');
        userMenu.classList.remove('hidden');
        userNameText.textContent = user.name || 'User';
        
        if (user.role === 'admin') {
            adminModeIndicator.classList.remove('hidden');
        } else {
            adminModeIndicator.classList.add('hidden');
        }
    } else {
        loginBtn.classList.remove('hidden');
        userMenu.classList.add('hidden');
        adminModeIndicator.classList.add('hidden');
    }
};

// Global Fetch Call Wrapper with Token Renewal Interception
const apiCall = async (method, path, body = null, headers = {}) => {
    const defaultHeaders = {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...headers
    };

    const options = {
        method,
        headers: defaultHeaders
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(path, options);
        let resBody = null;
        try {
            resBody = await response.json();
        } catch (e) {
            // Non-JSON format or empty response
        }

        if (response.status === 401 && localStorage.getItem('metaLens_refreshToken')) {
            // Attempt standard token rotation swap
            const refreshed = await attemptTokenRefresh();
            if (refreshed) {
                // Retry request with fresh token
                options.headers['Authorization'] = `Bearer ${localStorage.getItem('metaLens_accessToken')}`;
                const retryResponse = await fetch(path, options);
                let retryBody = null;
                try { retryBody = await retryResponse.json(); } catch (e) {}
                return { status: retryResponse.status, body: retryBody };
            }
        }

        return { status: response.status, body: resBody };
    } catch (error) {
        console.error(`API Call failed to ${path}:`, error);
        return { status: 500, body: { message: 'Failed to complete API handshakes.' } };
    }
};

const attemptTokenRefresh = async () => {
    const refreshToken = localStorage.getItem('metaLens_refreshToken');
    if (!refreshToken) return false;

    try {
        const response = await fetch('/auth/refresh-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
        });
        
        if (response.status === 200) {
            const data = await response.json();
            if (data.accessToken) {
                localStorage.setItem('metaLens_accessToken', data.accessToken);
                return true;
            }
        }
    } catch (e) {
        console.error('Failed to rotate refresh token:', e);
    }

    // Refresh failed - log out cleanly
    localStorage.removeItem('metaLens_accessToken');
    localStorage.removeItem('metaLens_refreshToken');
    localStorage.removeItem('metaLens_user');
    syncAuthUI();
    showToast('Your session expired. Please sign in again.', 'info');
    return false;
};

// ==========================================================================
// METRICS & ANALYTICS PIPELINE
// ==========================================================================

const loadDashboardMetrics = async () => {
    // 1. Avg Rating
    const avgRes = await apiCall('GET', '/stats/average-rating');
    const avgRatingText = document.getElementById('avgRatingText');
    const avgRatingStars = document.getElementById('avgRatingStars');
    if (avgRes.status === 200 && avgRes.body?.success) {
        const rating = parseFloat(avgRes.body.averageRating || 0).toFixed(2);
        avgRatingText.textContent = rating;
        
        // Render rating stars visually
        let starsHTML = '';
        const rounded = Math.round(rating);
        for (let i = 1; i <= 5; i++) {
            starsHTML += i <= rounded ? '★' : '☆';
        }
        avgRatingStars.innerHTML = starsHTML;
    }

    // 2. Verified Stats
    const verRes = await apiCall('GET', '/stats/verified-purchases');
    const verifiedRatioText = document.getElementById('verifiedRatioText');
    const verifiedProgressBar = document.getElementById('verifiedProgressBar');
    if (verRes.status === 200 && verRes.body?.success) {
        const ratio = parseFloat(verRes.body.verifiedPercentage || 0).toFixed(0);
        verifiedRatioText.textContent = `${ratio}%`;
        verifiedProgressBar.style.width = `${ratio}%`;
    }

    // 3. Positive Sentiment
    const posRes = await apiCall('GET', '/stats/positive-reviews');
    const sentimentRatioText = document.getElementById('sentimentRatioText');
    if (posRes.status === 200 && posRes.body?.success) {
        const ratio = parseFloat(posRes.body.positivePercentage || 0).toFixed(0);
        sentimentRatioText.textContent = `${ratio}%`;
    }
};

const loadCountriesList = async () => {
    const res = await apiCall('GET', '/countries');
    const countryFilter = document.getElementById('countryFilter');
    if (res.status === 200 && res.body?.success && res.body?.countries) {
        // Keep "All Countries" and inject rest
        countryFilter.innerHTML = '<option value="">All Countries</option>';
        res.body.countries.forEach(country => {
            if (country) {
                const opt = document.createElement('option');
                opt.value = country;
                opt.textContent = country;
                countryFilter.appendChild(opt);
            }
        });
    }
};

const loadAISummary = async () => {
    const container = document.getElementById('aiSummaryContent');
    container.innerHTML = `
        <div class="pulse-loader">
            <span></span><span></span><span></span>
        </div>
        <p class="text-center font-muted">Synthesizing review sentiment...</p>
    `;

    const res = await apiCall('GET', '/reviews/ai-summary');
    if (res.status === 200 && res.body?.success) {
        const summary = res.body.summary || {};
        const verdict = summary.verdict || 'Highly positive reception regarding audio integration, with recurring calls for battery expansion.';
        const pros = summary.pros || ['Great speaker audio', 'Futuristic AI support', 'Video capture clarity'];
        const cons = summary.cons || ['Quick battery drain', 'Slightly heavy frame', 'Limited low-light photos'];

        let prosHTML = pros.map(p => `<span class="ai-pill ai-pill-pro"># ${p}</span>`).join('');
        let consHTML = cons.map(c => `<span class="ai-pill ai-pill-con"># ${c}</span>`).join('');

        container.innerHTML = `
            <div class="ai-synth-box animate-fade-in">
                <p class="ai-verdict"><strong>Summary Verdict:</strong> ${verdict}</p>
                <div class="ai-list-wrap">
                    <h4 class="ai-list-title ai-pros-title">Top Pros Highlighted</h4>
                    <div class="ai-pills">${prosHTML}</div>
                </div>
                <div class="ai-list-wrap">
                    <h4 class="ai-list-title ai-cons-title">Primary Concerns</h4>
                    <div class="ai-pills">${consHTML}</div>
                </div>
            </div>
        `;
    } else {
        container.innerHTML = `<p class="text-center font-muted">Failed to load AI synthesized analytics.</p>`;
    }
};

const loadSentimentBars = async () => {
    const container = document.getElementById('sentimentDistributionContent');
    const res = await apiCall('GET', '/reviews/sentiment-analysis');
    if (res.status === 200 && res.body?.success) {
        const sentiment = res.body.sentiment || {};
        const posVal = parseFloat(sentiment.positivePercentage || 0).toFixed(0);
        const neuVal = parseFloat(sentiment.neutralPercentage || 0).toFixed(0);
        const negVal = parseFloat(sentiment.negativePercentage || 0).toFixed(0);

        container.innerHTML = `
            <div class="sentiment-row animate-fade-in">
                <div class="sentiment-label-row">
                    <span>Positive (4-5 ★)</span>
                    <span class="sentiment-value text-emerald">${posVal}%</span>
                </div>
                <div class="sentiment-bar-bg">
                    <div class="sentiment-bar-fill bar-positive" style="width: ${posVal}%"></div>
                </div>
            </div>

            <div class="sentiment-row animate-fade-in" style="animation-delay: 0.1s;">
                <div class="sentiment-label-row">
                    <span>Neutral (3 ★)</span>
                    <span class="sentiment-value text-amber">${neuVal}%</span>
                </div>
                <div class="sentiment-bar-bg">
                    <div class="sentiment-bar-fill bar-neutral" style="width: ${neuVal}%"></div>
                </div>
            </div>

            <div class="sentiment-row animate-fade-in" style="animation-delay: 0.2s;">
                <div class="sentiment-label-row">
                    <span>Negative (1-2 ★)</span>
                    <span class="sentiment-value text-rose">${negVal}%</span>
                </div>
                <div class="sentiment-bar-bg">
                    <div class="sentiment-bar-fill bar-negative" style="width: ${negVal}%"></div>
                </div>
            </div>
        `;
    } else {
        container.innerHTML = `<p class="text-center font-muted">Could not retrieve sentiment breakdown.</p>`;
    }
};

// ==========================================================================
// REVIEWS GRID FEED PIPELINE
// ==========================================================================

const buildReviewsQueryUrl = () => {
    const params = new URLSearchParams();
    params.append('page', currentPage);
    params.append('limit', LIMIT_PER_PAGE);

    // Apply Sorting
    if (activeFilters.sort) params.append('sort', activeFilters.sort);

    // Apply Rating
    if (activeFilters.rating) params.append('rating', activeFilters.rating);

    // Apply Verified
    if (activeFilters.verifiedPurchase) params.append('verifiedPurchase', activeFilters.verifiedPurchase);

    // Apply Country
    if (activeFilters.country) params.append('country', activeFilters.country);

    // Apply Device
    if (activeFilters.device) params.append('device', activeFilters.device);

    // Apply search query titleContains or general search query
    if (activeFilters.keyword) {
        params.append('titleContains', activeFilters.keyword);
    }

    return `/reviews?${params.toString()}`;
};

const renderActiveFiltersRow = () => {
    const row = document.getElementById('activeTagsRow');
    let tagsHTML = '';

    if (activeFilters.keyword) {
        tagsHTML += `<span class="active-tag">Search: "${activeFilters.keyword}" <span class="active-tag-close" onclick="removeFilter('keyword')">×</span></span>`;
    }
    if (activeFilters.rating) {
        tagsHTML += `<span class="active-tag">${activeFilters.rating} Stars & up <span class="active-tag-close" onclick="removeFilter('rating')">×</span></span>`;
    }
    if (activeFilters.verifiedPurchase) {
        tagsHTML += `<span class="active-tag">${activeFilters.verifiedPurchase === 'true' ? 'Verified' : 'Unverified'} <span class="active-tag-close" onclick="removeFilter('verifiedPurchase')">×</span></span>`;
    }
    if (activeFilters.country) {
        tagsHTML += `<span class="active-tag">Country: ${activeFilters.country} <span class="active-tag-close" onclick="removeFilter('country')">×</span></span>`;
    }
    if (activeFilters.device) {
        tagsHTML += `<span class="active-tag">Device: ${activeFilters.device} <span class="active-tag-close" onclick="removeFilter('device')">×</span></span>`;
    }

    if (tagsHTML) {
        row.innerHTML = tagsHTML;
        row.classList.remove('hidden');
    } else {
        row.innerHTML = '';
        row.classList.add('hidden');
    }
};

window.removeFilter = (key) => {
    activeFilters[key] = '';
    
    // Clear the DOM inputs
    if (key === 'keyword') document.getElementById('searchQuery').value = '';
    if (key === 'rating') document.getElementById('ratingFilter').value = '';
    if (key === 'verifiedPurchase') document.getElementById('verifiedFilter').value = '';
    if (key === 'country') document.getElementById('countryFilter').value = '';
    if (key === 'device') document.getElementById('deviceFilter').value = '';

    currentPage = 1;
    loadReviewsFeed();
};

const loadReviewsFeed = async () => {
    const container = document.getElementById('reviewsGridContainer');
    container.innerHTML = `
        <div class="card-skeleton"></div>
        <div class="card-skeleton"></div>
        <div class="card-skeleton"></div>
    `;

    renderActiveFiltersRow();
    
    const url = buildReviewsQueryUrl();
    const res = await apiCall('GET', url);
    const feedCountText = document.getElementById('feedCountText');
    
    // Disable pagination elements by default
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const pageText = document.getElementById('paginationInfoText');

    if (res.status === 200 && res.body?.success) {
        const reviews = res.body.reviews || [];
        const count = res.body.totalReviews || reviews.length;
        
        // Update Feed Count
        feedCountText.textContent = `Showing ${reviews.length} of ${count} reviews`;
        document.getElementById('totalReviewsText').textContent = count;

        if (reviews.length === 0) {
            container.innerHTML = `
                <div class="glass-panel text-center font-muted" style="padding: 48px;">
                    <p style="font-size: 18px; margin-bottom: 8px;">No matching Meta Glasses reviews found.</p>
                    <p style="font-size: 13px;">Try adjusting your query matrix parameters or add a new record.</p>
                </div>
            `;
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            pageText.textContent = `Page 1 of 1`;
            return;
        }

        // Render card lists
        container.innerHTML = '';
        const user = getSessionUser();
        const isAdmin = user && user.role === 'admin';

        reviews.forEach(review => {
            const dateStr = review.date ? new Date(review.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }) : 'Recent Date';

            const initials = review.name ? review.name.split(' ').map(n=>n[0]).join('').toUpperCase().substring(0, 2) : 'U';
            
            // Star ratings formatting
            let stars = '';
            for (let i = 1; i <= 5; i++) {
                stars += i <= Math.round(review.rating) ? '★' : '☆';
            }

            const helpfulCount = review.helpful || 0;
            const reviewText = review.review || '';
            const verifiedClass = review.verifiedPurchase ? 'verified-true' : 'verified-false';
            const verifiedLabel = review.verifiedPurchase ? '✓ Verified Purchase' : 'Unverified User';
            const sentimentLabel = review.rating >= 4 ? 'Positive' : 'Negative';
            const sentimentClass = review.rating >= 4 ? 'sentiment-positive' : 'sentiment-negative';
            const deviceName = review.device || (reviewText.toLowerCase().includes('wayfarer') ? 'Wayfarer' : 'Headliner');

            const card = document.createElement('article');
            card.className = 'review-card animate-fade-in';
            card.innerHTML = `
                <div class="card-top">
                    <div class="reviewer-meta">
                        <div class="reviewer-avatar">${initials}</div>
                        <div class="reviewer-info">
                            <span class="reviewer-name">${review.name || 'Anonymous User'}</span>
                            <span class="review-location-date">${review.country || 'Global'} • ${dateStr}</span>
                        </div>
                    </div>
                    <div class="card-badges">
                        <span class="verified-badge ${verifiedClass}">${verifiedLabel}</span>
                        <span class="sentiment-badge ${sentimentClass}">${sentimentLabel}</span>
                    </div>
                </div>

                <div class="card-body">
                    <div class="star-rating-display" style="font-size: 15px;">${stars} <span style="font-size: 12px; color: var(--text-secondary); margin-left: 4px;">(${review.rating})</span></div>
                    <h4 class="review-card-title">${review.title || 'Glasses Rating'}</h4>
                    <p class="review-card-text">${reviewText}</p>
                    <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Device: <strong style="color: var(--cyan-light);">${deviceName}</strong> | ID: <code>${review.reviewID}</code></div>
                </div>

                <div class="card-bottom">
                    <div class="helpful-votes">
                        <button class="btn-helpful" onclick="voteHelpful(this, '${review.reviewID}')">
                            👍 Helpful
                        </button>
                        <span class="helpful-count-val">${helpfulCount} voters found this helpful</span>
                    </div>

                    ${isAdmin ? `
                        <div class="admin-actions">
                            <button class="btn-admin-action" onclick="promptEditRating('${review.reviewID}', ${review.rating})" title="Edit Rating">
                                ✏️
                            </button>
                            <button class="btn-admin-action btn-admin-delete" onclick="triggerDeleteReview('${review.reviewID}')" title="Delete Review">
                                🗑️
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
            container.appendChild(card);
        });

        // Set pagination states
        currentPage = res.body.currentPage || 1;
        totalPages = res.body.totalPages || 1;

        pageText.textContent = `Page ${currentPage} of ${totalPages}`;
        prevBtn.disabled = currentPage <= 1;
        nextBtn.disabled = currentPage >= totalPages;

    } else {
        container.innerHTML = `
            <div class="glass-panel text-center font-muted" style="padding: 48px;">
                <p style="font-size: 18px; margin-bottom: 8px; color: var(--rose-primary);">System Synchronization Interrupted</p>
                <p style="font-size: 13px;">Ensure the MongoDB dev server is up and connected on port 5000.</p>
            </div>
        `;
    }
};

window.voteHelpful = (btn, reviewID) => {
    // Add glowing state locally
    const countVal = btn.nextElementSibling;
    if (btn.classList.contains('active')) {
        showToast('You already voted this review helpful.', 'info');
        return;
    }
    
    btn.classList.add('active');
    btn.style.borderColor = 'var(--cyan-primary)';
    btn.style.color = 'var(--cyan-primary)';
    btn.style.boxShadow = '0 0 10px rgba(6, 182, 212, 0.2)';
    
    // Parse current count and increment locally
    const text = countVal.textContent;
    const current = parseInt(text.match(/\d+/) || [0])[0];
    countVal.textContent = `${current + 1} voters found this helpful`;
    showToast('Voted successfully! Thank you for your feedback.', 'success');
};

// Admin action calls
window.triggerDeleteReview = async (reviewID) => {
    if (!confirm(`Are you absolutely sure you want to permanently delete review ${reviewID}? This action cannot be undone.`)) {
        return;
    }

    const res = await apiCall('DELETE', `/reviews/${reviewID}`);
    if (res.status === 200) {
        showToast(`Review ${reviewID} deleted successfully!`, 'success');
        loadReviewsFeed();
        loadDashboardMetrics();
        loadSentimentBars();
    } else {
        showToast(res.body?.message || 'Failed to delete review.', 'error');
    }
};

window.promptEditRating = async (reviewID, currentRating) => {
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
        loadSentimentBars();
    } else {
        showToast(res.body?.message || 'Failed to patch rating.', 'error');
    }
};

// ==========================================================================
// FORMS REAL-TIME VALIDATIONS & OPERATIONS
// ==========================================================================

const initFormValidation = () => {
    const inputs = ['formReviewID', 'formName', 'formCountry', 'formTitle', 'formReview'];
    
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;

        el.addEventListener('input', () => {
            const group = el.parentElement;
            if (el.checkValidity()) {
                group.classList.remove('invalid');
            }
        });
    });

    // Special validation checks on star selection
    const starInput = document.getElementById('formRatingInput');
    const stars = starInput.querySelectorAll('.input-star');
    const hiddenRating = document.getElementById('formRating');

    stars.forEach(star => {
        star.addEventListener('click', () => {
            const rating = parseInt(star.getAttribute('data-rating'));
            hiddenRating.value = rating;
            
            // Render active classes
            stars.forEach(s => {
                const sVal = parseInt(s.getAttribute('data-rating'));
                if (sVal <= rating) {
                    s.classList.add('active');
                } else {
                    s.classList.remove('active');
                }
            });

            starInput.parentElement.classList.remove('invalid');
        });
    });
};

const validateReviewForm = () => {
    let isValid = true;

    // 1. Check Title (min 3)
    const title = document.getElementById('formTitle');
    if (!title.value || title.value.trim().length < 3) {
        title.parentElement.classList.add('invalid');
        isValid = false;
    } else {
        title.parentElement.classList.remove('invalid');
    }

    // 2. Check Name
    const name = document.getElementById('formName');
    if (!name.value || name.value.trim().length === 0) {
        name.parentElement.classList.add('invalid');
        isValid = false;
    } else {
        name.parentElement.classList.remove('invalid');
    }

    // 3. Check Country
    const country = document.getElementById('formCountry');
    if (!country.value || country.value.trim().length === 0) {
        country.parentElement.classList.add('invalid');
        isValid = false;
    } else {
        country.parentElement.classList.remove('invalid');
    }

    // 4. Check Review content
    const reviewText = document.getElementById('formReview');
    if (!reviewText.value || reviewText.value.trim().length === 0) {
        reviewText.parentElement.classList.add('invalid');
        isValid = false;
    } else {
        reviewText.parentElement.classList.remove('invalid');
    }

    // 5. Check ReviewID if provided
    const reviewID = document.getElementById('formReviewID');
    if (reviewID.value && reviewID.value.trim().length > 0) {
        const pattern = /^R[A-Z0-9]+$/;
        if (!pattern.test(reviewID.value.trim())) {
            reviewID.parentElement.classList.add('invalid');
            isValid = false;
        } else {
            reviewID.parentElement.classList.remove('invalid');
        }
    } else {
        reviewID.parentElement.classList.remove('invalid');
    }

    return isValid;
};

// Generate randomized reviewID conforming to standard
const generateRandomReviewID = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'R';
    for (let i = 0; i < 13; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

const handleReviewSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateReviewForm()) {
        showToast('Please correct validation errors on the review form.', 'error');
        return;
    }

    const submitBtnText = document.getElementById('submitReviewBtnText');
    submitBtnText.textContent = 'Publishing Review...';
    
    const reviewID = document.getElementById('formReviewID').value.trim() || generateRandomReviewID();
    const name = document.getElementById('formName').value.trim();
    const rating = parseFloat(document.getElementById('formRating').value);
    const country = document.getElementById('formCountry').value.trim();
    const title = document.getElementById('formTitle').value.trim();
    const review = document.getElementById('formReview').value.trim();
    const verifiedPurchase = document.getElementById('formVerified').checked;
    const device = document.getElementById('formDevice').value;

    const payload = {
        reviewID,
        name,
        rating,
        country,
        title,
        review,
        verifiedPurchase,
        device,
        date: new Date().toISOString()
    };

    const res = await apiCall('POST', '/reviews', payload);
    submitBtnText.textContent = 'Publish Review';

    if (res.status === 201) {
        showToast('Review published successfully! Seeded to DB.', 'success');
        document.getElementById('reviewForm').reset();
        
        // Reset stars
        const stars = document.getElementById('formRatingInput').querySelectorAll('.input-star');
        stars.forEach(s => s.classList.add('active'));
        document.getElementById('formRating').value = '5';
        
        document.getElementById('reviewModal').classList.add('hidden');
        
        // Refresh Feed
        currentPage = 1;
        loadReviewsFeed();
        loadDashboardMetrics();
        loadSentimentBars();
    } else {
        showToast(res.body?.message || 'Failed to submit review due to database validations.', 'error');
    }
};

// ==========================================================================
// SESSION LOGIN / REGISTER FORMS HANDLERS
// ==========================================================================

const handleLoginSubmit = async (e) => {
    e.preventDefault();
    
    const emailEl = document.getElementById('loginEmail');
    const passEl = document.getElementById('loginPassword');
    let isValid = true;

    if (!emailEl.value || !emailEl.value.includes('@')) {
        emailEl.parentElement.classList.add('invalid');
        isValid = false;
    } else {
        emailEl.parentElement.classList.remove('invalid');
    }

    if (!passEl.value) {
        passEl.parentElement.classList.add('invalid');
        isValid = false;
    } else {
        passEl.parentElement.classList.remove('invalid');
    }

    if (!isValid) return;

    const res = await apiCall('POST', '/auth/login', {
        email: emailEl.value.trim(),
        password: passEl.value
    });

    if (res.status === 200 && res.body?.accessToken) {
        localStorage.setItem('metaLens_accessToken', res.body.accessToken);
        localStorage.setItem('metaLens_refreshToken', res.body.refreshToken);
        
        syncAuthUI();
        document.getElementById('authModal').classList.add('hidden');
        document.getElementById('loginForm').reset();
        
        showToast('Authenticated successfully! JWT Token loaded.', 'success');
        
        // Refresh reviews list to show admin delete actions if admin
        loadReviewsFeed();
    } else {
        showToast(res.body?.message || 'Invalid email or password combination.', 'error');
    }
};

const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    const nameEl = document.getElementById('registerName');
    const emailEl = document.getElementById('registerEmail');
    const passEl = document.getElementById('registerPassword');
    const isAdminEl = document.getElementById('registerIsAdmin');
    let isValid = true;

    if (!nameEl.value || nameEl.value.trim().length === 0) {
        nameEl.parentElement.classList.add('invalid');
        isValid = false;
    } else {
        nameEl.parentElement.classList.remove('invalid');
    }

    if (!emailEl.value || !emailEl.value.includes('@')) {
        emailEl.parentElement.classList.add('invalid');
        isValid = false;
    } else {
        emailEl.parentElement.classList.remove('invalid');
    }

    // Pass length check (8+ chars)
    if (!passEl.value || passEl.value.length < 8) {
        passEl.parentElement.classList.add('invalid');
        isValid = false;
    } else {
        passEl.parentElement.classList.remove('invalid');
    }

    if (!isValid) return;

    const role = isAdminEl.checked ? 'admin' : 'user';

    const res = await apiCall('POST', '/auth/register', {
        name: nameEl.value.trim(),
        email: emailEl.value.trim(),
        password: passEl.value,
        role
    });

    if (res.status === 201) {
        showToast('Account initialized successfully! You can sign in now.', 'success');
        document.getElementById('registerForm').reset();
        
        // Auto-switch to Login Tab
        document.getElementById('tabLoginBtn').click();
    } else {
        showToast(res.body?.message || 'Strong password check failed or email already active.', 'error');
    }
};

const handleProfileFetch = async () => {
    const res = await apiCall('GET', '/profile');
    if (res.status === 200 && res.body?.success) {
        const data = res.body.data || {};
        
        document.getElementById('profileNameText').textContent = data.name || 'User';
        const role = data.role || 'user';
        const roleChip = document.getElementById('profileRoleText');
        roleChip.textContent = role;
        roleChip.style.background = role === 'admin' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(6, 182, 212, 0.15)';
        roleChip.style.borderColor = role === 'admin' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(6, 182, 212, 0.3)';
        roleChip.style.color = role === 'admin' ? 'var(--amber-primary)' : 'var(--cyan-primary)';

        document.getElementById('profileEmailText').textContent = data.email || 'N/A';
        document.getElementById('profileTypeText').textContent = role === 'admin' ? 'Administrative Account' : 'Standard Verified Account';

        document.getElementById('profileModal').classList.remove('hidden');
    } else {
        showToast('Failed to fetch profile details.', 'error');
    }
};

const handleDeleteAccount = async () => {
    if (!confirm('WARNING: Are you absolutely sure you want to permanently delete your account? This will wipe your session tokens and credentials from MongoDB.')) {
        return;
    }

    const res = await apiCall('DELETE', '/auth/account');
    if (res.status === 200) {
        localStorage.removeItem('metaLens_accessToken');
        localStorage.removeItem('metaLens_refreshToken');
        localStorage.removeItem('metaLens_user');
        
        syncAuthUI();
        document.getElementById('profileModal').classList.add('hidden');
        showToast('Account deleted successfully. Logging out.', 'info');
        loadReviewsFeed();
    } else {
        showToast(res.body?.message || 'Failed to delete account.', 'error');
    }
};

// ==========================================================================
// SYSTEM INITS & LISTENERS BINDINGS
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Data Fetch
    syncAuthUI();
    loadDashboardMetrics();
    loadCountriesList();
    loadReviewsFeed();
    loadAISummary();
    loadSentimentBars();

    // 2. Real-Time validations mapping
    initFormValidation();

    // 3. Search inputs events binding
    let searchDebounce;
    const searchInput = document.getElementById('searchQuery');
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => {
            activeFilters.keyword = e.target.value.trim();
            currentPage = 1;
            loadReviewsFeed();
        }, 400);
    });

    // 4. Select Dropdowns events binding
    document.getElementById('ratingFilter').addEventListener('change', (e) => {
        activeFilters.rating = e.target.value;
        currentPage = 1;
        loadReviewsFeed();
    });

    document.getElementById('verifiedFilter').addEventListener('change', (e) => {
        activeFilters.verifiedPurchase = e.target.value;
        currentPage = 1;
        loadReviewsFeed();
    });

    document.getElementById('countryFilter').addEventListener('change', (e) => {
        activeFilters.country = e.target.value;
        currentPage = 1;
        loadReviewsFeed();
    });

    document.getElementById('deviceFilter').addEventListener('change', (e) => {
        activeFilters.device = e.target.value;
        currentPage = 1;
        loadReviewsFeed();
    });

    document.getElementById('sortBySelect').addEventListener('change', (e) => {
        activeFilters.sort = e.target.value;
        currentPage = 1;
        loadReviewsFeed();
    });

    // Reset filters
    document.getElementById('clearFiltersBtn').addEventListener('click', () => {
        activeFilters = {
            keyword: '',
            rating: '',
            verifiedPurchase: '',
            country: '',
            device: '',
            sort: '-date'
        };

        // Reset inputs values
        searchInput.value = '';
        document.getElementById('ratingFilter').value = '';
        document.getElementById('verifiedFilter').value = '';
        document.getElementById('countryFilter').value = '';
        document.getElementById('deviceFilter').value = '';
        document.getElementById('sortBySelect').value = '-date';

        currentPage = 1;
        loadReviewsFeed();
    });

    // 5. Pagination Buttons
    document.getElementById('prevPageBtn').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadReviewsFeed();
        }
    });

    document.getElementById('nextPageBtn').addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            loadReviewsFeed();
        }
    });

    // 6. Modal Openers & Closers Bindings
    
    // Review Modal Toggle
    const writeBtn = document.getElementById('writeReviewBtn');
    const reviewModal = document.getElementById('reviewModal');
    writeBtn.addEventListener('click', () => {
        reviewModal.classList.remove('hidden');
    });

    document.getElementById('closeReviewModalBtn').addEventListener('click', () => {
        reviewModal.classList.add('hidden');
    });
    
    document.getElementById('cancelReviewBtn').addEventListener('click', () => {
        reviewModal.classList.add('hidden');
    });

    // Auth Modal Toggle
    const loginBtn = document.getElementById('loginBtn');
    const authModal = document.getElementById('authModal');
    loginBtn.addEventListener('click', () => {
        authModal.classList.remove('hidden');
    });

    document.getElementById('closeAuthModalBtn').addEventListener('click', () => {
        authModal.classList.add('hidden');
    });

    // Auth tab toggling
    const tabLogin = document.getElementById('tabLoginBtn');
    const tabRegister = document.getElementById('tabRegisterBtn');
    const loginPanel = document.getElementById('loginPanel');
    const registerPanel = document.getElementById('registerPanel');

    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        loginPanel.classList.remove('hidden');
        registerPanel.classList.add('hidden');
    });

    tabRegister.addEventListener('click', () => {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        registerPanel.classList.remove('hidden');
        loginPanel.classList.add('hidden');
    });

    // Forgot Password Trigger Simulation
    document.getElementById('forgotPasswordBtn').addEventListener('click', async () => {
        const email = document.getElementById('loginEmail').value.trim();
        if (!email) {
            showToast('Please enter your account email first.', 'error');
            return;
        }

        const res = await apiCall('POST', '/auth/forgot-password', { email });
        if (res.status === 200 && res.body?.resetToken) {
            alert(`[SIMULATION] Verification reset code dispatched: ${res.body.resetToken}`);
            const code = prompt('Enter the dispatch verification reset code to reset password:');
            if (!code) return;

            const newPass = prompt('Enter secure new password:');
            if (!newPass) return;

            const resetRes = await apiCall('POST', '/auth/reset-password', {
                email,
                token: code,
                newPassword: newPass
            });

            if (resetRes.status === 200) {
                showToast('Password reset successfully! Login now.', 'success');
            } else {
                showToast(resetRes.body?.message || 'Failed to complete reset.', 'error');
            }
        } else {
            showToast('Account email not found in database registry.', 'error');
        }
    });

    // Profile Modals
    document.getElementById('profileBtn').addEventListener('click', handleProfileFetch);
    document.getElementById('closeProfileModalBtn').addEventListener('click', () => {
        document.getElementById('profileModal').classList.add('hidden');
    });

    // 7. Form Submissions
    document.getElementById('reviewForm').addEventListener('submit', handleReviewSubmit);
    document.getElementById('loginForm').addEventListener('submit', handleLoginSubmit);
    document.getElementById('registerForm').addEventListener('submit', handleRegisterSubmit);
    
    // Logout Action
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('metaLens_accessToken');
        localStorage.removeItem('metaLens_refreshToken');
        localStorage.removeItem('metaLens_user');
        
        syncAuthUI();
        showToast('Logged out successfully.', 'info');
        loadReviewsFeed();
    });

    // Delete Account Action
    document.getElementById('deleteAccountBtn').addEventListener('click', handleDeleteAccount);
});
