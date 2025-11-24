import CompanyCard from "./CompanyCard";
import CompanyCardSkeleton from "./CompanyCardSkeleton";

const CompaniesList = ({ companies, loadingMore }) => (
  <div className="space-y-2 md:space-y-4">
    {companies.map((company, index) => (
      <CompanyCard key={index} company={company} />
    ))}

    {/* Loading more skeletons */}
    {loadingMore &&
      Array.from({ length: 7 }).map((_, index) => (
        <CompanyCardSkeleton key={`loading-${index}`} />
      ))}
  </div>
);

export default CompaniesList;
