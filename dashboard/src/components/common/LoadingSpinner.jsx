export default function LoadingSpinner({ size = 'md' }) {
  const sizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className="flex items-center justify-center p-12 min-h-[200px]">
      <div className={`${sizes[size]} border-[3px] border-gray-200 border-t-blue-600 rounded-full animate-spin`} />
    </div>
  );
}
