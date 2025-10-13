import { useState, useEffect } from 'preact/hooks';
import { BuildingOfficeIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useOrganizationManagement, type Role } from '../../../hooks/useOrganizationManagement';
import { features } from '../../../config/features';
import { Button } from '../../ui/Button';
import { SectionDivider } from '../../ui/layout/SectionDivider';
import { RoleBadge } from '../../ui/badges/RoleBadge';
import Modal from '../../Modal';
import { Input } from '../../ui/Input';
import { FormLabel } from '../../ui/form/FormLabel';
import { useToastContext } from '../../../contexts/ToastContext';
import { formatDate } from '../../../utils/dateTime';

interface OrganizationPageProps {
  className?: string;
}

export const OrganizationPage = ({ className = '' }: OrganizationPageProps) => {
  const { 
    currentOrganization, 
    members,
    invitations, 
    loading, 
    error,
    createOrganization,
    acceptInvitation,
    fetchMembers,
    refetch 
  } = useOrganizationManagement();
  
  const { showSuccess, showError } = useToastContext();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    slug: '',
    description: ''
  });

  const hasOrganization = !!currentOrganization;
  const memberCount = members.length;

  // Fetch members when we have an organization
  useEffect(() => {
    if (currentOrganization) {
      fetchMembers(currentOrganization.id);
    }
  }, [currentOrganization, fetchMembers]);

  const handleCreateOrganization = async () => {
    if (!createForm.name.trim()) {
      showError('Organization name is required');
      return;
    }

    try {
      await createOrganization({
        name: createForm.name,
        slug: createForm.slug || undefined,
        description: createForm.description || undefined,
      });
      
      showSuccess('Organization created successfully!');
      setShowCreateModal(false);
      setCreateForm({ name: '', slug: '', description: '' });
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create organization');
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      await acceptInvitation(invitationId);
      showSuccess('Invitation accepted!');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to accept invitation');
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    // TODO: Implement decline invitation
    showError('Decline invitation not implemented yet');
  };

  if (loading) {
    return (
      <div className={`h-full flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">Loading organization...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`h-full flex items-center justify-center ${className}`}>
        <div className="text-center">
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <Button size="sm" onClick={refetch}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${className}`}>
      <div className="px-6 py-4">
        <h1 className="text-lg font-semibold">Organization</h1>
        <SectionDivider />
      </div>
      
      <div className="flex-1 overflow-y-auto px-6">
        <div className="space-y-0">
          {hasOrganization ? (
            <>
              {/* Current Organization */}
              <div className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold">{currentOrganization.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {currentOrganization.slug} • <RoleBadge role="owner" />
                    </p>
                    {currentOrganization.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {currentOrganization.description}
                      </p>
                    )}
                  </div>
                  <Button size="sm" onClick={() => window.location.href = '/settings/organization/details'}>
                    Manage
                  </Button>
                </div>
              </div>
              
              <SectionDivider />
              
              {/* Team Summary */}
              <div className="py-3">
                <h3 className="text-sm font-semibold mb-2">Team</h3>
                <p className="text-xs text-gray-500 mb-2">{memberCount} members</p>
                {members.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {members.slice(0, 3).map((member, index) => (
                      <div key={member.userId} className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">{member.email}</span>
                        <RoleBadge role={member.role} />
                        {index < Math.min(members.length, 3) - 1 && <span className="text-xs text-gray-400">•</span>}
                      </div>
                    ))}
                    {members.length > 3 && (
                      <span className="text-xs text-gray-400">+{members.length - 3} more</span>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* No Organization State */
            <div className="py-3">
              <div className="text-center py-8">
                <BuildingOfficeIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-sm font-semibold mb-2">No Organization Yet</h3>
                <p className="text-xs text-gray-500 mb-4">
                  Create your law firm or accept an invitation
                </p>
                {features.enableMultipleOrganizations && (
                  <Button size="sm" onClick={() => setShowCreateModal(true)}>
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Create Organization
                  </Button>
                )}
              </div>
            </div>
          )}
          
          <SectionDivider />
          
          {/* Pending Invitations */}
          <div className="py-3">
            <h3 className="text-sm font-semibold mb-4">Pending Invitations</h3>
            {invitations.length > 0 ? (
              <div className="space-y-3">
                {invitations.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{inv.organizationId}</p>
                      <p className="text-xs text-gray-500">
                        Role: <RoleBadge role={inv.role} /> • Expires: {formatDate(inv.expiresAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleAcceptInvitation(inv.id)}>
                        Accept
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => handleDeclineInvitation(inv.id)}>
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">No pending invitations</p>
            )}
          </div>
        </div>
      </div>

      {/* Create Organization Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Organization"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <FormLabel htmlFor="org-name">Organization Name *</FormLabel>
            <Input
              id="org-name"
              value={createForm.name}
              onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Your Law Firm Name"
              required
            />
          </div>
          
          <div>
            <FormLabel htmlFor="org-slug">Slug (optional)</FormLabel>
            <Input
              id="org-slug"
              value={createForm.slug}
              onChange={(e) => setCreateForm(prev => ({ ...prev, slug: e.target.value }))}
              placeholder="your-law-firm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Used in URLs. Leave empty to auto-generate.
            </p>
          </div>
          
          <div>
            <FormLabel htmlFor="org-description">Description (optional)</FormLabel>
            <Input
              id="org-description"
              value={createForm.description}
              onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of your practice"
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              variant="secondary" 
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateOrganization}>
              Create Organization
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
