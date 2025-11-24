import ContactCard from "./ContactCard";
import ContactCardSkeleton from "./ContactCardSkeleton";

const ContactsList = ({ contacts, loadingMore }) => (
  <div className="space-y-2 md:space-y-4">
    {contacts.map((contact, index) => (
      <ContactCard key={index} contact={contact} />
    ))}

    {/* Loading more skeletons */}
    {loadingMore &&
      Array.from({ length: 7 }).map((_, index) => (
        <ContactCardSkeleton key={`loading-${index}`} />
      ))}
  </div>
);

export default ContactsList;
