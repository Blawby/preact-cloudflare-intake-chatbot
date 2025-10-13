import { useNavigation } from '../../utils/navigation';
import Modal from '../Modal';
import { Button } from '../ui/Button';
import { UserGroupIcon, BuildingOfficeIcon, KeyIcon } from '@heroicons/react/24/outline';

interface BusinessWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BusinessWelcomeModal = ({ isOpen, onClose }: BusinessWelcomeModalProps) => {
  const { navigate } = useNavigation();

  const handleGoToSettings = () => {
    onClose();
    navigate('/settings/organization');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="p-8">
        <h2 className="text-2xl font-bold mb-4">Welcome to Business!</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Your organization has been upgraded. Here's what you can do now:
        </p>

        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-3">
              <UserGroupIcon className="h-6 w-6 text-blue-400" />
            </div>
            <h3 className="font-medium mb-1">Team Management</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Invite members</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
              <BuildingOfficeIcon className="h-6 w-6 text-green-400" />
            </div>
            <h3 className="font-medium mb-1">Organization Settings</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Configure your org</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-3">
              <KeyIcon className="h-6 w-6 text-purple-400" />
            </div>
            <h3 className="font-medium mb-1">API Access</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Generate tokens</p>
          </div>
        </div>

        <Button variant="primary" className="w-full" onClick={handleGoToSettings}>
          Go to Organization Settings
        </Button>
      </div>
    </Modal>
  );
};
