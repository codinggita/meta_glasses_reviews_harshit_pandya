import React, { useState, useEffect } from 'react';
import { apiCall } from '../utils/api';

export default function ReviewWizard({ isOpen, onClose, onSuccess, initialData = null }) {
  const [formValues, setFormValues] = useState({
    reviewID: '',
    name: '',
    rating: 5,
    country: '',
    title: '',
    review: '',
    verifiedPurchase: true,
    device: 'Wayfarer'
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormValues({
        reviewID: initialData.reviewID || '',
        name: initialData.name || '',
        rating: initialData.rating || 5,
        country: initialData.country || '',
        title: initialData.title || '',
        review: initialData.review || '',
        verifiedPurchase: initialData.verifiedPurchase !== undefined ? initialData.verifiedPurchase : true,
        device: initialData.device || 'Wayfarer'
      });
    } else {
      let draft = null;
      try {
        const saved = sessionStorage.getItem('metaLens_newReviewDraft');
        if (saved) draft = JSON.parse(saved);
      } catch (e) {}

      setFormValues(draft || {
        reviewID: '',
        name: '',
        rating: 5,
        country: '',
        title: '',
        review: '',
        verifiedPurchase: true,
        device: 'Wayfarer'
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  // Save form progress for new reviews (drafts) in sessionStorage
  useEffect(() => {
    if (!initialData && isOpen) {
      sessionStorage.setItem('metaLens_newReviewDraft', JSON.stringify(formValues));
    }
  }, [formValues, isOpen, initialData]);

  if (!isOpen) return null;

  const handleStarClick = (rating) => {
    setFormValues(prev => ({ ...prev, rating }));
    if (errors.rating) {
      setErrors(prev => ({ ...prev, rating: null }));
    }
  };

  const handleInputChange = (e) => {
    const { id, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    
    setFormValues(prev => ({ ...prev, [id]: val }));
    
    // Clear validation error on change
    if (errors[id]) {
      setErrors(prev => ({ ...prev, [id]: null }));
    }
  };

  const generateRandomReviewID = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'R';
    for (let i = 0; i < 13; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const validateForm = () => {
    const newErrors = {};

    if (formValues.reviewID.trim()) {
      if (!/^R[A-Z0-9]+$/.test(formValues.reviewID.trim())) {
        newErrors.reviewID = "Review ID must start with 'R' and be alphanumeric.";
      }
    }

    if (!formValues.name.trim()) {
      newErrors.name = "Reviewer name is required.";
    }

    if (!formValues.country.trim()) {
      newErrors.country = "Country is required.";
    }

    if (!formValues.title.trim() || formValues.title.trim().length < 3) {
      newErrors.title = "Review title is required and must be at least 3 characters.";
    }

    if (!formValues.review.trim()) {
      newErrors.review = "Review text content is required.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    const finalReviewID = formValues.reviewID.trim() || generateRandomReviewID();
    
    const payload = {
      reviewID: finalReviewID,
      name: formValues.name.trim(),
      rating: parseFloat(formValues.rating),
      country: formValues.country.trim(),
      title: formValues.title.trim(),
      review: formValues.review.trim(),
      verifiedPurchase: formValues.verifiedPurchase,
      device: formValues.device,
      date: new Date().toISOString()
    };

    try {
      let res;
      if (initialData) {
        // Edit flow (PUT request to replace review details)
        res = await apiCall('PUT', `/reviews/${initialData.reviewID}`, payload);
      } else {
        // Create flow
        res = await apiCall('POST', '/reviews', payload);
      }

      if (res.status === 200 || res.status === 201) {
        if (!initialData) {
          sessionStorage.removeItem('metaLens_newReviewDraft');
        }
        onSuccess(initialData ? 'Review updated successfully!' : 'Review published successfully!');
        onClose();
      } else {
        setErrors({
          api: res.body?.message || 'Database validation failed. Double check review fields.'
        });
      }
    } catch (err) {
      console.error(err);
      setErrors({ api: 'Failed to connect to reviews server.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="glass-modal">
        <button className="modal-close" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="modal-header">
          <h3 className="modal-title">
            {initialData ? 'Modify Your Experience' : 'Share Your Meta Glasses Experience'}
          </h3>
          <p className="modal-subtitle">
            {initialData 
              ? `Editing review: ${initialData.reviewID}` 
              : 'Submit review details below. Custom rating and spam checks apply.'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {errors.api && (
            <div className="form-group invalid" style={{ marginBottom: '18px' }}>
              <span className="error-msg" style={{ display: 'block', fontSize: '13px' }}>
                ⚠️ {errors.api}
              </span>
            </div>
          )}

          <div className="form-row">
            <div className={`form-group half-width ${errors.reviewID ? 'invalid' : ''}`}>
              <label htmlFor="reviewID">Review ID</label>
              <input
                type="text"
                id="reviewID"
                placeholder="e.g. R99TESTVALIDATION"
                value={formValues.reviewID}
                onChange={handleInputChange}
                disabled={!!initialData} // Lock reviewID on edits
              />
              <div className="form-help">Must start with R and be alphanumeric. If empty, a random unique ID is generated.</div>
              <span className="error-msg">{errors.reviewID}</span>
            </div>
            <div className={`form-group half-width ${errors.name ? 'invalid' : ''}`}>
              <label htmlFor="name">Your Name *</label>
              <input
                type="text"
                id="name"
                placeholder="e.g. John Doe"
                value={formValues.name}
                onChange={handleInputChange}
                required
              />
              <span className="error-msg">{errors.name}</span>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group half-width">
              <label>Rating *</label>
              <div className="star-rating-input">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`input-star ${formValues.rating >= star ? 'active' : ''}`}
                    onClick={() => handleStarClick(star)}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>
            <div className={`form-group half-width ${errors.country ? 'invalid' : ''}`}>
              <label htmlFor="country">Country *</label>
              <input
                type="text"
                id="country"
                placeholder="e.g. United States"
                value={formValues.country}
                onChange={handleInputChange}
                required
              />
              <span className="error-msg">{errors.country}</span>
            </div>
          </div>

          <div className={`form-group ${errors.title ? 'invalid' : ''}`}>
            <label htmlFor="title">Review Title *</label>
            <input
              type="text"
              id="title"
              placeholder="e.g. Incredible audio but short battery life"
              value={formValues.title}
              onChange={handleInputChange}
              required
            />
            <span className="error-msg">{errors.title}</span>
          </div>

          <div className={`form-group ${errors.review ? 'invalid' : ''}`}>
            <label htmlFor="review">Detailed Review Content *</label>
            <textarea
              id="review"
              rows="4"
              placeholder="How did the smart features, sound quality, camera, and comfort work for you?"
              value={formValues.review}
              onChange={handleInputChange}
              required
            ></textarea>
            <span className="error-msg">{errors.review}</span>
          </div>

          <div className="form-row">
            <div className="form-group half-width checkbox-group">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  id="verifiedPurchase"
                  checked={formValues.verifiedPurchase}
                  onChange={handleInputChange}
                />
                <span className="checkmark"></span>
                Verified Purchase
              </label>
            </div>
            <div className="form-group half-width">
              <label htmlFor="device">Device Used</label>
              <select id="device" value={formValues.device} onChange={handleInputChange}>
                <option value="Wayfarer">Wayfarer Smart Shades</option>
                <option value="Headliner">Headliner Smart Shades</option>
                <option value="Other">Other / Meta Smart Glasses</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <span>{submitting ? 'Processing...' : initialData ? 'Update Review' : 'Publish Review'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
