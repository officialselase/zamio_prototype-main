import React from 'react';

const ReviewFlagDisputeCommentModal = ({ isOpen, onConfirm, onCancel, itemId, inputError, setComment, comment }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-50">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Review Flag Playlog</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          You are about to review this playlog dispute. Are you sure you want to
          take this action?
        </p>
        <div>
          <label
            htmlFor="comment"
            className="block text-gray-900 dark:text-white text-sm font-bold mb-2"
          >
            Comment <span className="text-red-500">*</span>
          </label>

          {inputError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-3">
              <strong className="font-bold">Error!</strong>
              <span className="block sm:inline"> {inputError}</span>
            </div>
          )}

          <textarea
            placeholder="Comment here..."
            rows="4"
            id="comment"
            name="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
            className="w-full bg-slate-700 text-white p-3 rounded-md border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="mt-6 flex justify-end space-x-4">
          <button
            onClick={() => onConfirm(itemId)}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Confirm
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewFlagDisputeCommentModal;
