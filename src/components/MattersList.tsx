import { PlusIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { MattersListProps } from '../types/matter';
import MatterCard from './MatterCard';
import { Button } from './ui/Button';
import { componentStyles } from '../config/component-styles';

const MattersList = ({ matters, onMatterSelect, onCreateMatter, isLoading }: MattersListProps) => {
  if (isLoading) {
    return (
      <div className={componentStyles.pageContainer}>
        <div className={componentStyles.headerContainer}>
          <h2 className={componentStyles.title}>Matters</h2>
          <Button 
            variant="primary"
            onClick={onCreateMatter}
            disabled
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Create Matter
          </Button>
        </div>
        <div className={componentStyles.loadingContainer}>
          <div className={componentStyles.loadingText}>Loading matters...</div>
        </div>
      </div>
    );
  }

  if (matters.length === 0) {
    return (
      <div className={componentStyles.pageContainer}>
        <div className={componentStyles.headerContainer}>
          <h2 className={componentStyles.title}>Matters</h2>
          <Button 
            variant="primary"
            onClick={onCreateMatter}
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Create Matter
          </Button>
        </div>
        <div className={componentStyles.emptyState}>
          <DocumentTextIcon className={componentStyles.emptyIcon} />
          <h3 className={componentStyles.emptyTitle}>No matters yet</h3>
          <p className={componentStyles.emptyDescription}>
            Create your first matter to get started with legal assistance.
          </p>
          <Button 
            variant="primary"
            onClick={onCreateMatter}
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Create Your First Matter
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={componentStyles.pageContainer}>
      <div className={componentStyles.headerContainer}>
        <h2 className={componentStyles.title}>
          Matters ({matters.length})
        </h2>
        <Button 
          variant="primary"
          onClick={onCreateMatter}
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Create Matter
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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