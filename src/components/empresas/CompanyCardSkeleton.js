// Skeleton component for company cards
const CompanyCardSkeleton = () => (
  <div className="flex flex-col border-1 border-[#e7e7e7] shadow-[0 8px 24px rgba(0, 0, 0, .06)] rounded-lg animate-pulse">
    <div
      className="flex items-center justify-center w-full h-28 border-b rounded-t-lg p-2 md:p-4"
      style={{
        borderBottomColor: "#e7e7e7",
        background: `
          linear-gradient(180deg, #e7e7e7 0 20%, transparent 20% 100%),
          radial-gradient(1000px 320px at 90% -80px, rgba(255,255,255,.14), rgba(255,255,255,0) 60%),
          linear-gradient(180deg, #e7e7e7 0 20%, #fff 85%)
        `,
      }}
    ></div>
    <div className="flex flex-col gap-2 p-2 md:p-4">
      <div className="bg-gray-200 rounded w-2/3 h-4"></div>
      <div className="bg-gray-200 rounded w-1/3 h-3"></div>
      <div className="bg-gray-200 rounded w-full h-3"></div>
    </div>
  </div>
);

export default CompanyCardSkeleton;
