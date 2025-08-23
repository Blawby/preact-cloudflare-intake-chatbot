import { LightBulbIcon, Cog6ToothIcon, SparklesIcon } from '@heroicons/react/24/outline';
import DOMPurify from 'dompurify';
import type { ComponentType, SVGProps } from 'react';
import type { VNode } from 'preact';

// Define allowed variant types
export type AIThinkingVariant = 'thinking' | 'processing' | 'generating';

// Type for icon components
type IconComponentType = ComponentType<SVGProps<SVGSVGElement>>;

// Icon and default message mapping with proper typing
const variantConfig = {
  thinking: {
    icon: LightBulbIcon,
    defaultMessage: 'AI is thinking',
    ariaLabel: 'AI is thinking'
  },
  processing: {
    icon: Cog6ToothIcon,
    defaultMessage: 'Processing your request',
    ariaLabel: 'Processing your request'
  },
  generating: {
    icon: SparklesIcon,
    defaultMessage: 'Generating response',
    ariaLabel: 'Generating response'
  }
} satisfies Record<AIThinkingVariant, {
  icon: IconComponentType;
  defaultMessage: string;
  ariaLabel: string;
}>;

export interface AIThinkingIndicatorProps {
  message?: string;
  variant?: AIThinkingVariant;
  className?: string;
  content?: string; // For showing streaming content
}

export function AIThinkingIndicator({
  message,
  variant = 'thinking',
  className = '',
  content
}: AIThinkingIndicatorProps): VNode {
  const config = variantConfig[variant];
  const IconComponent: IconComponentType = config.icon;
  const displayMessage = message ?? config.defaultMessage;

  // For streaming content, return wrapped prose div to match final state
  if (content) {
    return (
      <div className={`text-base leading-6 min-h-4 ${className}`}>
        <div className="prose prose-xs sm:prose-sm md:prose-base lg:prose-lg max-w-none dark:prose-invert prose-headings:font-semibold prose-p:leading-relaxed prose-ul:leading-relaxed prose-ol:leading-relaxed">
          <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />
        </div>
      </div>
    );
  }

  // For thinking indicators, use the full wrapper
  return (
    <div 
      className={`text-base leading-6 min-h-4 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-atomic="true"
    >
      <div className="flex items-center gap-2 motion-safe:animate-pulse motion-reduce:animate-none">
        <IconComponent 
          className="w-4 h-4 flex-shrink-0 text-gray-600 dark:text-gray-300" 
          aria-hidden="true"
        />
        <div className="prose prose-xs sm:prose-sm md:prose-base lg:prose-lg max-w-none dark:prose-invert prose-headings:font-semibold prose-p:leading-relaxed prose-ul:leading-relaxed prose-ol:leading-relaxed">
          {displayMessage}
        </div>
      </div>
    </div>
  );
}
