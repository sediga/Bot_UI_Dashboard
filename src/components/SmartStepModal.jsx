export default function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-start justify-center overflow-auto">
      <div
        className="relative bg-white p-6 rounded shadow-lg w-full max-w-4xl mt-10 mx-4 sm:mx-6 md:mx-12"
        style={{ maxHeight: '90vh' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="overflow-y-auto max-h-[75vh]">
          {children}
        </div>
      </div>
    </div>
  );
}
