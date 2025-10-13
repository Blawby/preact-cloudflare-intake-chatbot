import { useState, useEffect } from 'preact/hooks';
import { 
  TrashIcon, 
  PlusIcon, 
  UserPlusIcon,
  KeyIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { useOrganizationManagement, type Role } from '../../../hooks/useOrganizationManagement';
import { Button } from '../../ui/Button';
import { SectionDivider } from '../../ui/layout/SectionDivider';
import { RoleBadge } from '../../ui/badges/RoleBadge';
import { StatusBadge } from '../../ui/badges/StatusBadge';
import { CopyButton } from '../../ui/CopyButton';
import Modal from '../../Modal';
import { Input } from '../../ui/Input';
import { FormLabel } from '../../ui/form/FormLabel';
import { Select } from '../../ui/input/Select';
import { useToastContext } from '../../../contexts/ToastContext';
import { formatDate } from '../../../utils/dateTime';
import { getSession } from '../../../lib/authClient';

interface OrganizationDetailsPageProps {
  className?: string;
}

export const OrganizationDetailsPage = ({ className = '' }: OrganizationDetailsPageProps) => {
  const { 
    currentOrganization,
    members,
    tokens,
    workspaceData,
    loading,
    error,
    updateOrganization,
    deleteOrganization,
    fetchMembers,
    updateMemberRole,
    removeMember,
    sendInvitation,
    fetchTokens,
    createToken,
    revokeToken,
    fetchWorkspaceData
  } = useOrganizationManagement();
  
  const { showSuccess, showError } = useToastContext();
  
  // Get current user's identity from auth session
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [currentUserRole, setCurrentUserRole] = useState<Role>('member');
  
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const session = await getSession();
        if (session?.user?.email) {
          setCurrentUserEmail(session.user.email);
        }
      } catch (error) {
        console.error('Failed to get current user session:', error);
      }
    };
    
    getCurrentUser();
  }, []);
  
  // Update current user role when members or email changes
  useEffect(() => {
    if (currentUserEmail && members.length > 0) {
      const userMember = members.find(member => member.email === currentUserEmail);
      setCurrentUserRole(userMember?.role || 'member');
    } else if (members.length === 0 && !loading) {
      // If members haven't loaded yet, default to non-privileged role
      setCurrentUserRole('member');
    }
  }, [currentUserEmail, members, loading]);
  
  const isOwner = currentUserRole === 'owner';
  const isAdmin = currentUserRole === 'admin' || isOwner;
  
  // Form states
  const [orgForm, setOrgForm] = useState({
    name: '',
    description: ''
  });
  
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'attorney' as Role
  });
  
  const [tokenForm, setTokenForm] = useState({
    name: ''
  });
  
  const [workspaceResource, setWorkspaceResource] = useState('contact-forms');
  
  // Modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newToken, setNewToken] = useState<{ token: string; tokenId: string } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Initialize form with current organization data
  useEffect(() => {
    if (currentOrganization) {
      setOrgForm({
        name: currentOrganization.name,
        description: currentOrganization.description || ''
      });
      
      // Fetch related data
      fetchMembers(currentOrganization.id);
      fetchTokens(currentOrganization.id);
      fetchWorkspaceData(currentOrganization.id, workspaceResource);
    }
  }, [currentOrganization, fetchMembers, fetchTokens, fetchWorkspaceData, workspaceResource]);

  const handleUpdateOrganization = async () => {
    if (!currentOrganization) return;
    
    try {
      await updateOrganization(currentOrganization.id, orgForm);
      showSuccess('Organization updated successfully!');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update organization');
    }
  };

  const handleDeleteOrganization = async () => {
    if (!currentOrganization) return;
    
    if (deleteConfirmText !== currentOrganization.name) {
      showError('Organization name does not match. Please type the exact name to confirm deletion.');
      return;
    }
    
    try {
      await deleteOrganization(currentOrganization.id);
      showSuccess('Organization deleted successfully!');
      // Navigate back to organization list
      window.location.href = '/settings/organization';
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete organization');
    }
  };

  const handleSendInvitation = async () => {
    if (!currentOrganization || !inviteForm.email.trim()) return;
    
    try {
      await sendInvitation(currentOrganization.id, inviteForm.email, inviteForm.role);
      showSuccess('Invitation sent successfully!');
      setShowInviteModal(false);
      setInviteForm({ email: '', role: 'attorney' });
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to send invitation');
    }
  };

  const handleCreateToken = async () => {
    if (!currentOrganization || !tokenForm.name.trim()) return;
    
    try {
      const result = await createToken(currentOrganization.id, tokenForm.name);
      setNewToken(result);
      setShowTokenModal(false);
      setTokenForm({ name: '' });
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create token');
    }
  };

  const handleRevokeToken = async (tokenId: string) => {
    if (!currentOrganization) return;
    
    try {
      await revokeToken(currentOrganization.id, tokenId);
      showSuccess('Token revoked successfully!');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to revoke token');
    }
  };

  const handleUpdateMemberRole = async (userId: string, newRole: Role) => {
    if (!currentOrganization) return;
    
    try {
      await updateMemberRole(currentOrganization.id, userId, newRole);
      showSuccess('Member role updated successfully!');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update member role');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!currentOrganization) return;
    
    try {
      await removeMember(currentOrganization.id, userId);
      showSuccess('Member removed successfully!');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  if (loading) {
    return (
      <div className={`h-full flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">Loading organization details...</p>
        </div>
      </div>
    );
  }

  if (error || !currentOrganization) {
    return (
      <div className={`h-full flex items-center justify-center ${className}`}>
        <div className="text-center">
          <p className="text-sm text-red-600 mb-4">{error || 'Organization not found'}</p>
          <Button size="sm" onClick={() => window.location.href = '/settings/organization'}>
            Back to Organization
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${className}`}>
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Organization Details</h1>
          <Button 
            size="sm" 
            variant="secondary"
            onClick={() => window.location.href = '/settings/organization'}
          >
            Back
          </Button>
        </div>
        <SectionDivider />
      </div>
      
      <div className="flex-1 overflow-y-auto px-6">
        <div className="space-y-6">
          {/* General Settings */}
          <div>
            <h2 className="text-sm font-semibold mb-4">General Settings</h2>
            <div className="space-y-4">
              <div>
                <FormLabel htmlFor="org-name">Organization Name</FormLabel>
                <Input
                  id="org-name"
                  value={orgForm.name}
                  onChange={(e) => setOrgForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              
              <div>
                <FormLabel htmlFor="org-description">Description</FormLabel>
                <Input
                  id="org-description"
                  value={orgForm.description}
                  onChange={(e) => setOrgForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of your practice"
                />
              </div>
              
              <Button onClick={handleUpdateOrganization}>
                Save Changes
              </Button>
            </div>
          </div>

          <SectionDivider />

          {/* Team Members */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Team Members</h2>
              {isAdmin && (
                <Button 
                  size="sm" 
                  onClick={() => setShowInviteModal(true)}
                >
                  <UserPlusIcon className="w-4 h-4 mr-2" />
                  Invite Member
                </Button>
              )}
            </div>
            
            <div className="space-y-3">
              {members.map(member => (
                <div key={member.userId} className="flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                        {member.name?.charAt(0) || member.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{member.name || member.email}</p>
                      <p className="text-xs text-gray-500">{member.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {isOwner ? (
                      <Select
                        value={member.role}
                        onChange={(e) => handleUpdateMemberRole(member.userId, e.target.value as Role)}
                        className="text-xs"
                      >
                        <option value="owner">Owner</option>
                        <option value="admin">Admin</option>
                        <option value="attorney">Attorney</option>
                        <option value="paralegal">Paralegal</option>
                      </Select>
                    ) : (
                      <RoleBadge role={member.role} />
                    )}
                    
                    {isAdmin && member.role !== 'owner' && (
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => handleRemoveMember(member.userId)}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <SectionDivider />

          {/* API Tokens */}
          {isOwner && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold">API Tokens</h2>
                <Button 
                  size="sm" 
                  onClick={() => setShowTokenModal(true)}
                >
                  <KeyIcon className="w-4 h-4 mr-2" />
                  Create Token
                </Button>
              </div>
            
            <div className="space-y-3">
              {tokens.map(token => (
                <div key={token.id} className="flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{token.name}</p>
                    <p className="text-xs text-gray-500">
                      Created: {formatDate(token.createdAt)}
                      {token.lastUsed && ` • Last used: ${formatDate(token.lastUsed)}`}
                    </p>
                  </div>
                  
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => handleRevokeToken(token.id)}
                  >
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
            </div>
          )}

          <SectionDivider />

          {/* Workspace Data */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Workspace Data</h2>
              <div className="flex items-center space-x-2">
                <Select
                  value={workspaceResource}
                  onChange={(e) => setWorkspaceResource(e.target.value)}
                  className="text-xs"
                >
                  <option value="contact-forms">Contact Forms</option>
                  <option value="sessions">Sessions</option>
                  <option value="matters">Matters</option>
                  <option value="payments">Payments</option>
                </Select>
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={() => currentOrganization && fetchWorkspaceData(currentOrganization.id, workspaceResource)}
                >
                  <ChartBarIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              {workspaceData.length > 0 ? (
                workspaceData.map((item, index) => (
                  <div key={index} className="py-2 px-3 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(item, null, 2)}
                    </pre>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500">No {workspaceResource} data available</p>
              )}
            </div>
          </div>

          <SectionDivider />

          {/* Danger Zone */}
          {isOwner && (
            <div>
              <h2 className="text-sm font-semibold text-red-600 mb-4">Danger Zone</h2>
              <div className="p-4 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Deleting your organization will permanently remove all data and cannot be undone.
                </p>
                <Button 
                  variant="secondary"
                  onClick={() => setShowDeleteModal(true)}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <TrashIcon className="w-4 h-4 mr-2" />
                  Delete Organization
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invite Member Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite Team Member"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <FormLabel htmlFor="invite-email">Email Address *</FormLabel>
            <Input
              id="invite-email"
              type="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="colleague@example.com"
              required
            />
          </div>
          
          <div>
            <FormLabel htmlFor="invite-role">Role</FormLabel>
            <Select
              id="invite-role"
              value={inviteForm.role}
              onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value as Role }))}
            >
              <option value="attorney">Attorney</option>
              <option value="paralegal">Paralegal</option>
              <option value="admin">Admin</option>
            </Select>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              variant="secondary" 
              onClick={() => setShowInviteModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSendInvitation}>
              Send Invitation
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Token Modal */}
      <Modal
        isOpen={showTokenModal}
        onClose={() => setShowTokenModal(false)}
        title="Create API Token"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <FormLabel htmlFor="token-name">Token Name *</FormLabel>
            <Input
              id="token-name"
              value={tokenForm.name}
              onChange={(e) => setTokenForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="My API Token"
              required
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              variant="secondary" 
              onClick={() => setShowTokenModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateToken}>
              Create Token
            </Button>
          </div>
        </div>
      </Modal>

      {/* New Token Display Modal */}
      <Modal
        isOpen={!!newToken}
        onClose={() => setNewToken(null)}
        title="API Token Created"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
              <strong>Important:</strong> This token will only be shown once. Copy it now and store it securely.
            </p>
          </div>
          
          <div>
            <FormLabel>Your API Token</FormLabel>
            <div className="flex items-center space-x-2">
              <Input
                value={newToken?.token || ''}
                readOnly
                className="font-mono text-sm"
              />
              <CopyButton text={newToken?.token || ''} />
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <Button onClick={() => setNewToken(null)}>
              I've Copied the Token
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Organization Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Organization"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">
              <strong>Warning:</strong> This action cannot be undone. All organization data, 
              members, and settings will be permanently deleted.
            </p>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Type the organization name <strong>{currentOrganization.name}</strong> to confirm deletion.
          </p>
          
          <div>
            <FormLabel htmlFor="delete-confirm">Organization Name</FormLabel>
            <Input
              id="delete-confirm"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type organization name here"
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              variant="secondary" 
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteOrganization}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Organization
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
