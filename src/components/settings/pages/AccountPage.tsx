import { useState, useEffect, useCallback } from 'preact/hooks';
import { SettingsSection } from '../SettingsSection';
import { SettingsItem } from '../SettingsItem';
import { Button } from '../../ui/Button';
import { 
  UserIcon, 
  EnvelopeIcon, 
  PhoneIcon, 
  MapPinIcon,
  PhotoIcon,
  ArrowLeftIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { useNavigation } from '../../../utils/navigation';
import { useToastContext } from '../../../contexts/ToastContext';

// Utility function for className merging (following codebase pattern)
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export interface AccountPageProps {
  isMobile?: boolean;
  onClose?: () => void;
  className?: string;
}

export const AccountPage = ({
  isMobile = false,
  onClose,
  className = ''
}: AccountPageProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    phone: '',
    secondaryPhone: '',
    addressStreet: '',
    addressCity: '',
    addressState: '',
    addressZip: '',
    addressCountry: '',
    preferredContactMethod: 'email' as 'email' | 'phone' | 'sms'
  });

  // No authentication required - profile is always null
  const profile = null;
  const loading = false;
  const error = null;
  const updateProfile = async () => {};
  const uploadAvatar = async () => {};
  const deleteAvatar = async () => {};
  const { navigate } = useNavigation();
  const { showError } = useToastContext();

  const resetFormData = useCallback(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        bio: profile.bio || '',
        phone: profile.phone || '',
        secondaryPhone: profile.secondaryPhone || '',
        addressStreet: profile.addressStreet || '',
        addressCity: profile.addressCity || '',
        addressState: profile.addressState || '',
        addressZip: profile.addressZip || '',
        addressCountry: profile.addressCountry || '',
        preferredContactMethod: (profile.preferredContactMethod as 'email' | 'phone' | 'sms') || 'email'
      });
    }
  }, [profile]);

  // Initialize form data when profile loads
  useEffect(() => {
    resetFormData();
  }, [profile, resetFormData]);

  const handleSave = async () => {
    if (!profile) return;
    
    setIsSaving(true);
    try {
      await updateProfile(formData);
      setIsEditing(false);
    } catch (_error) {
      // Error handling could be improved with toast notifications
      // For now, we rely on the error state from the hook
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    resetFormData();
    setIsEditing(false);
  };

  const handleAvatarUpload = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      showError(
        'File too large',
        'Avatar images must be smaller than 5MB. Please choose a smaller file.',
        5000
      );
      // Reset the file input
      target.value = '';
      return;
    }

    try {
      await uploadAvatar(file);
      setShowAvatarUpload(false);
    } catch (_error) {
      // Error handling could be improved with toast notifications
      // For now, we rely on the error state from the hook
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      await deleteAvatar();
    } catch (_error) {
      // Error handling could be improved with toast notifications
      // For now, we rely on the error state from the hook
    }
  };

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else {
      navigate('/settings');
    }
  };

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('p-8 text-center', className)}>
        <p className="text-red-600 dark:text-red-400">Error loading profile: {error}</p>
        <Button onClick={handleBack} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={cn('p-8 text-center', className)}>
        <p className="text-gray-600 dark:text-gray-400">Profile not found</p>
        <Button onClick={handleBack} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('h-full flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-dark-border">
        {isMobile && (
          <button
            onClick={handleBack}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Account Settings
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage your profile and personal information
          </p>
        </div>
        {!isEditing ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              icon={isSaving ? undefined : <CheckIcon />}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Profile Image Section */}
        <SettingsSection
          title="Profile Image"
          description="Your profile picture"
        >
          <div className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-accent-500 flex items-center justify-center flex-shrink-0">
                {profile.image ? (
                  <img 
                    src={profile.image} 
                    alt={profile.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-8 h-8 text-white" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Profile Picture
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Upload a new image or remove the current one
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<PhotoIcon />}
                    onClick={() => setShowAvatarUpload(!showAvatarUpload)}
                  >
                    {profile.image ? 'Change' : 'Upload'}
                  </Button>
                  {profile.image && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDeleteAvatar}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>
            
            {showAvatarUpload && (
              <div className="mt-4 p-4 border border-gray-200 dark:border-dark-border rounded-lg">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="w-full text-sm text-gray-500 dark:text-gray-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-medium
                    file:bg-accent-500 file:text-gray-900
                    hover:file:bg-accent-600
                    file:cursor-pointer cursor-pointer"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Supported formats: JPEG, PNG, WebP. Max size: 5MB.
                </p>
              </div>
            )}
          </div>
        </SettingsSection>

        {/* Profile Information Section */}
        <SettingsSection
          title="Profile Information"
          description="Basic information about you"
        >
          <SettingsItem
            icon={<UserIcon />}
            label="Name"
            type="input"
            value={formData.name}
            onChange={(value) => setFormData(prev => ({ ...prev, name: String(value) }))}
            placeholder="Enter your full name"
            disabled={!isEditing}
          />
          <SettingsItem
            icon={<EnvelopeIcon />}
            label="Email"
            value={profile.email}
            type="display"
            description="Email address (read-only)"
          />
          <div className="p-4">
            <label htmlFor="bio" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Bio
            </label>
            <textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: (e.target as HTMLTextAreaElement).value }))}
              placeholder="Tell us about yourself..."
              disabled={!isEditing}
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-input-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {formData.bio.length}/500 characters
            </p>
          </div>
        </SettingsSection>

        {/* Contact Information Section */}
        <SettingsSection
          title="Contact Information"
          description="How people can reach you"
        >
          <SettingsItem
            icon={<PhoneIcon />}
            label="Primary Phone"
            type="input"
            value={formData.phone}
            onChange={(value) => setFormData(prev => ({ ...prev, phone: String(value) }))}
            placeholder="+1 (555) 123-4567"
            disabled={!isEditing}
          />
          <SettingsItem
            icon={<PhoneIcon />}
            label="Secondary Phone"
            type="input"
            value={formData.secondaryPhone}
            onChange={(value) => setFormData(prev => ({ ...prev, secondaryPhone: String(value) }))}
            placeholder="+1 (555) 987-6543"
            disabled={!isEditing}
          />
          <div className="p-4">
            <fieldset>
              <legend className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Preferred Contact Method
              </legend>
              <div className="space-y-2">
                {(['email', 'phone', 'sms'] as const).map((method) => (
                  <label key={method} className="flex items-center">
                    <input
                      type="radio"
                      name="preferredContactMethod"
                      value={method}
                      checked={formData.preferredContactMethod === method}
                      onChange={(e) => setFormData(prev => ({ ...prev, preferredContactMethod: (e.target as HTMLInputElement).value as 'email' | 'phone' | 'sms' }))}
                      disabled={!isEditing}
                      className="mr-2 text-accent-500 focus:ring-accent-500 disabled:opacity-50"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100 capitalize">
                      {method}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </SettingsSection>

        {/* Address Section */}
        <SettingsSection
          title="Address"
          description="Your physical address"
        >
          <SettingsItem
            icon={<MapPinIcon />}
            label="Street Address"
            type="input"
            value={formData.addressStreet}
            onChange={(value) => setFormData(prev => ({ ...prev, addressStreet: String(value) }))}
            placeholder="123 Main Street"
            disabled={!isEditing}
          />
          <div className="grid grid-cols-2 gap-4 p-4">
            <div>
              <label htmlFor="addressCity" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                City
              </label>
              <input
                id="addressCity"
                type="text"
                value={formData.addressCity}
                onChange={(e) => setFormData(prev => ({ ...prev, addressCity: (e.target as HTMLInputElement).value }))}
                placeholder="City"
                disabled={!isEditing}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-input-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label htmlFor="addressState" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                State
              </label>
              <input
                id="addressState"
                type="text"
                value={formData.addressState}
                onChange={(e) => setFormData(prev => ({ ...prev, addressState: (e.target as HTMLInputElement).value }))}
                placeholder="State"
                disabled={!isEditing}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-input-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 p-4 pt-0">
            <div>
              <label htmlFor="addressZip" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                ZIP Code
              </label>
              <input
                id="addressZip"
                type="text"
                value={formData.addressZip}
                onChange={(e) => setFormData(prev => ({ ...prev, addressZip: (e.target as HTMLInputElement).value }))}
                placeholder="12345"
                disabled={!isEditing}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-input-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label htmlFor="addressCountry" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Country
              </label>
              <input
                id="addressCountry"
                type="text"
                value={formData.addressCountry}
                onChange={(e) => setFormData(prev => ({ ...prev, addressCountry: (e.target as HTMLInputElement).value }))}
                placeholder="Country"
                disabled={!isEditing}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-input-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
};
