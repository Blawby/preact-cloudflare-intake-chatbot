import { FunctionComponent } from 'preact';
import { useState } from 'preact/hooks';
import { Button } from './ui/Button';
import {
  UserIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  StarIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  ClockIcon,
  CurrencyDollarIcon,
  LanguageIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '../hooks/useTheme';

interface LawyerProfile {
  id: string;
  name: string;
  firm?: string;
  location: string;
  practiceAreas: string[];
  rating?: number;
  reviewCount?: number;
  phone?: string;
  email?: string;
  website?: string;
  bio?: string;
  experience?: string;
  languages?: string[];
  consultationFee?: number;
  availability?: string;
}

interface LawyerSearchResultsProps {
  matterType: string;
  lawyers: LawyerProfile[];
  total: number;
  onContactLawyer: (lawyer: LawyerProfile) => void;
  onSearchAgain: () => void;
}

const LawyerSearchResults: FunctionComponent<LawyerSearchResultsProps> = ({
  matterType,
  lawyers,
  total,
  onContactLawyer,
  onSearchAgain
}) => {
  const { isDark } = useTheme();
  const [selectedLawyer, setSelectedLawyer] = useState<LawyerProfile | null>(null);

  const handleContactLawyer = (lawyer: LawyerProfile) => {
    setSelectedLawyer(lawyer);
    onContactLawyer(lawyer);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <StarIcon key={i} className="w-4 h-4 text-yellow-400 fill-current" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <StarIcon key="half" className="w-4 h-4 text-yellow-400 fill-current opacity-50" />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <StarIcon key={`empty-${i}`} className="w-4 h-4 text-gray-300" />
      );
    }

    return stars;
  };

  if (lawyers.length === 0) {
    return (
      <div className={`p-6 rounded-lg shadow-md ${isDark ? 'bg-dark-card border border-dark-border' : 'bg-white border border-gray-200'}`}>
        <h3 className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          No Lawyers Found
        </h3>
        <p className={`text-sm mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          We couldn't find any lawyers in your area for {matterType}. Try searching again or contact us for assistance.
        </p>
        <Button variant="primary" onClick={onSearchAgain}>
          Search Again
        </Button>
      </div>
    );
  }

  return (
    <div className={`p-6 rounded-lg shadow-md ${isDark ? 'bg-dark-card border border-dark-border' : 'bg-white border border-gray-200'}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Lawyers for {matterType}
        </h3>
        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {lawyers.length} of {total} results
        </span>
      </div>

      <div className="space-y-4">
        {lawyers.map((lawyer) => (
          <div
            key={lawyer.id}
            className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
              isDark 
                ? 'bg-dark-bg border-dark-border hover:bg-dark-hover' 
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${isDark ? 'bg-dark-card' : 'bg-white'}`}>
                  <UserIcon className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {lawyer.name}
                  </h4>
                  {lawyer.firm && (
                    <div className="flex items-center text-sm text-gray-500">
                      <BuildingOfficeIcon className="w-4 h-4 mr-1" />
                      {lawyer.firm}
                    </div>
                  )}
                </div>
              </div>
              
              {lawyer.rating && (
                <div className="flex items-center space-x-1">
                  <div className="flex">{renderStars(lawyer.rating)}</div>
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    ({lawyer.reviewCount || 0})
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div className="flex items-center text-sm text-gray-600">
                <MapPinIcon className="w-4 h-4 mr-2 text-gray-400" />
                {lawyer.location}
              </div>
              
              {lawyer.experience && (
                <div className="flex items-center text-sm text-gray-600">
                  <ClockIcon className="w-4 h-4 mr-2 text-gray-400" />
                  {lawyer.experience} years experience
                </div>
              )}
              
              {lawyer.consultationFee && (
                <div className="flex items-center text-sm text-gray-600">
                  <CurrencyDollarIcon className="w-4 h-4 mr-2 text-gray-400" />
                  ${lawyer.consultationFee}/hour
                </div>
              )}
              
              {lawyer.languages && lawyer.languages.length > 0 && (
                <div className="flex items-center text-sm text-gray-600">
                  <LanguageIcon className="w-4 h-4 mr-2 text-gray-400" />
                  {lawyer.languages.join(', ')}
                </div>
              )}
            </div>

            {lawyer.practiceAreas && lawyer.practiceAreas.length > 0 && (
              <div className="mb-3">
                <div className="flex flex-wrap gap-1">
                  {lawyer.practiceAreas.slice(0, 3).map((area) => (
                    <span
                      key={area}
                      className={`px-2 py-1 text-xs rounded-full ${
                        isDark 
                          ? 'bg-blue-900 text-blue-200' 
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {area}
                    </span>
                  ))}
                  {lawyer.practiceAreas.length > 3 && (
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                    }`}>
                      +{lawyer.practiceAreas.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {lawyer.bio && (
              <p className={`text-sm mb-3 line-clamp-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                {lawyer.bio}
              </p>
            )}

            <div className="flex justify-between items-center">
              <div className="flex space-x-2">
                {lawyer.phone && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<PhoneIcon className="w-4 h-4" />}
                    onClick={() => window.open(`tel:${lawyer.phone}`)}
                  >
                    Call
                  </Button>
                )}
                {lawyer.email && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<EnvelopeIcon className="w-4 h-4" />}
                    onClick={() => window.open(`mailto:${lawyer.email}`)}
                  >
                    Email
                  </Button>
                )}
                {lawyer.website && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<GlobeAltIcon className="w-4 h-4" />}
                    onClick={() => window.open(lawyer.website, '_blank')}
                  >
                    Website
                  </Button>
                )}
              </div>
              
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleContactLawyer(lawyer)}
              >
                Contact Lawyer
              </Button>
            </div>
          </div>
        ))}
      </div>

      {total > lawyers.length && (
        <div className="mt-4 text-center">
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Showing {lawyers.length} of {total} lawyers. 
            <Button variant="ghost" size="sm" onClick={onSearchAgain} className="ml-1">
              Load More
            </Button>
          </p>
        </div>
      )}
    </div>
  );
};

export default LawyerSearchResults;
