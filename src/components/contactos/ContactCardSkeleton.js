// Skeleton component for contact cards
const ContactCardSkeleton = () => (
  <div className="flex gap-2 items-center p-2 border-1 border-[#0001] shadow-lg rounded-lg animate-pulse">
    <div className="w-18 h-18 bg-gray-200 rounded-lg"></div>
    <div className="flex flex-col justify-between gap-1 w-full">
      <div className="h-6 bg-gray-200 rounded w-3/4"></div>
      <div className="flex items-center gap-2">
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        <div className="h-4 bg-gray-200 rounded w-16"></div>
      </div>
      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
    </div>
  </div>
);

export default ContactCardSkeleton;
