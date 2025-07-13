import { PlusIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { MattersListProps } from '../types/matter';
import MatterCard from './MatterCard';
import LoadingIndicator from './LoadingIndicator';

const MattersList = ({ matters, onMatterSelect, onCreateMatter, isLoading }: MattersListProps) => {
  if (isLoading) {
    return (
      <div className="matters-list-container">
        <div className="matters-header">
          <h2 className="matters-title">Matters</h2>
          <button 
            className="create-matter-button"
            onClick={onCreateMatter}
            disabled
          >
            <PlusIcon className="w-4 h-4" />
            Create Matter
          </button>
        </div>
        <div className="matters-loading">
          <LoadingIndicator />
        </div>
      </div>
    );
  }

  if (matters.length === 0) {
    return (
      <div className="matters-list-container">
        <div className="matters-header">
          <h2 className="matters-title">Matters</h2>
          <button 
            className="create-matter-button"
            onClick={onCreateMatter}
          >
            <PlusIcon className="w-4 h-4" />
            Create Matter
          </button>
        </div>
        <div className="matters-empty">
          <DocumentTextIcon className="empty-icon" />
          <h3 className="empty-title">No matters yet</h3>
          <p className="empty-description">
            Create your first matter to get started with legal assistance.
          </p>
          <button 
            className="empty-create-button"
            onClick={onCreateMatter}
          >
            <PlusIcon className="w-4 h-4" />
            Create Your First Matter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="matters-list-container">
      <div className="matters-header">
        <h2 className="matters-title">
          Matters ({matters.length})
        </h2>
        <button 
          className="create-matter-button"
          onClick={onCreateMatter}
        >
          <PlusIcon className="w-4 h-4" />
          Create Matter
        </button>
      </div>
      
      <div className="matters-grid">
        {matters.map((matter) => (
          <MatterCard
            key={matter.id}
            matter={matter}
            onClick={() => onMatterSelect(matter)}
          />
        ))}
      </div>
    </div>
  );
};

export default MattersList; 