
export default function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
      <div className="relative bg-white p-6 rounded shadow-lg w-full max-w-lg">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl"
          aria-label="Close"
        >
         ✕
        </button>

        {children}
      </div>
    </div>
  );
}
