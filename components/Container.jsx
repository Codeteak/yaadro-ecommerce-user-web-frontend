export default function Container({ children, className = '' }) {
  return (
    <div
      className={`w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 overflow-x-hidden ${className}`}
    >
      {children}
    </div>
  );
}

