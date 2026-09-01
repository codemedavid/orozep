// src/components/ReviewsManager.tsx
import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Save, X, ArrowLeft, MessageSquare } from 'lucide-react';
import { useReviews } from '../hooks/useReviews';
import { useMenu } from '../hooks/useMenu';
import ImageUpload from './ImageUpload';
import { ikImage } from '../utils/imagekit';
import type { ReviewWithProducts } from '../types/review';
import { useConfirmDelete } from '../hooks/useConfirmDelete';
import ConfirmDeleteDialog from './ConfirmDeleteDialog';

interface ReviewsManagerProps {
  onBack?: () => void;
}

const ReviewsManager: React.FC<ReviewsManagerProps> = ({ onBack }) => {
  const { confirmDelete, confirmDialogProps } = useConfirmDelete();
  const { reviews, loading, addReview, updateReview, deleteReview } = useReviews();
  const { products } = useMenu();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    image_url: '',
    review_type: 'testimonial' as 'testimonial' | 'result_photo',
    featured: false,
  });
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      image_url: '',
      review_type: 'testimonial',
      featured: false,
    });
    setSelectedProductIds([]);
    setEditingId(null);
    setIsAdding(false);
  };

  const handleEdit = (review: ReviewWithProducts) => {
    setFormData({
      title: review.title || '',
      content: review.content || '',
      image_url: review.image_url || '',
      review_type: review.review_type,
      featured: review.featured,
    });
    setSelectedProductIds(review.linked_product_ids);
    setEditingId(review.id);
    setIsAdding(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.content && !formData.image_url) {
      alert('Please provide either review text or an image.');
      return;
    }

    setIsProcessing(true);
    try {
      const reviewPayload = {
        title: formData.title || null,
        content: formData.content || null,
        image_url: formData.image_url || null,
        review_type: formData.review_type,
        featured: formData.featured,
      };

      if (editingId) {
        await updateReview(editingId, reviewPayload, selectedProductIds);
      } else {
        await addReview(reviewPayload, selectedProductIds);
      }
      resetForm();
    } catch (err: any) {
      alert('Error saving review: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string, reviewTitle: string | null) => {
    // Reviews may be untitled; fall back to a phrase the admin can still type.
    const itemName = reviewTitle?.trim() || 'delete review';
    if (!(await confirmDelete({
        itemName,
        title: 'Delete this review?',
        description: 'This cannot be undone.',
      }))) return;
    try {
      await deleteReview(id);
    } catch (err: any) {
      alert('Error deleting review: ' + err.message);
    }
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reviews Manager</h1>
              <p className="text-sm text-gray-500">{reviews.length} reviews</p>
            </div>
          </div>
          {!isAdding && !editingId && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Review
            </button>
          )}
        </div>

        {/* Form */}
        {(isAdding || editingId) && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingId ? 'Edit Review' : 'Add New Review'}
            </h2>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  placeholder="e.g. Amazing results!"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Review Text (optional)</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  rows={4}
                  placeholder="Customer review text..."
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Review Image (optional)</label>
                <ImageUpload
                  currentImage={formData.image_url || null}
                  onImageChange={(url) => setFormData({ ...formData, image_url: url || '' })}
                  folder="review-images"
                />
              </div>

              {/* Review Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Review Type</label>
                <select
                  value={formData.review_type}
                  onChange={(e) => setFormData({ ...formData, review_type: e.target.value as 'testimonial' | 'result_photo' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                >
                  <option value="testimonial">Testimonial</option>
                  <option value="result_photo">Result Photo</option>
                </select>
              </div>

              {/* Featured Toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">Featured Review</span>
              </label>

              {/* Product Linker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link to Products (optional)</label>
                <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto p-2 space-y-1">
                  {products.map((product) => (
                    <label
                      key={product.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm ${
                        selectedProductIds.includes(product.id)
                          ? 'bg-teal-50 border border-teal-200'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedProductIds.includes(product.id)}
                        onChange={() => toggleProductSelection(product.id)}
                        className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                      />
                      <span className="text-gray-700">{product.name}</span>
                    </label>
                  ))}
                  {products.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-2">No products available</p>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-6">
              <button
                type="submit"
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isProcessing ? 'Saving...' : editingId ? 'Update Review' : 'Save Review'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Reviews List */}
        {loading ? (
          <p className="text-center text-gray-500 py-12">Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No reviews yet. Add your first review!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
              >
                <div className="flex gap-4">
                  {/* Thumbnail */}
                  {review.image_url && (
                    <img
                      src={ikImage(review.image_url, { w: 200 })}
                      alt={review.title || 'Review'}
                      className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                      loading="lazy"
                    />
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {review.featured && (
                        <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Featured</span>
                      )}
                      <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                        {review.review_type.replace('_', ' ')}
                      </span>
                    </div>
                    {review.title && (
                      <p className="font-semibold text-gray-900 text-sm">{review.title}</p>
                    )}
                    {review.content && (
                      <p className="text-gray-600 text-sm line-clamp-2 mt-1">{review.content}</p>
                    )}
                    {review.linked_product_ids.length > 0 && (
                      <p className="text-xs text-teal-600 mt-1">
                        Linked to {review.linked_product_ids.length} product{review.linked_product_ids.length > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-start gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(review)}
                      className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(review.id, review.title)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <ConfirmDeleteDialog {...confirmDialogProps} />
    </div>
  );
};

export default ReviewsManager;
