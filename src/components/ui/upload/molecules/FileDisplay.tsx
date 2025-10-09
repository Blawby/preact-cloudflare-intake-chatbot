/**
 * FileDisplay - Molecule Component (DEPRECATED)
 * 
 * This file is deprecated. Use the new atomic design structure:
 * - src/components/ui/upload/organisms/FileDisplay.tsx (main entry point)
 * - src/components/ui/upload/molecules/FileCard.tsx (file card)
 * - src/components/ui/upload/atoms/ (atomic components)
 * 
 * This file is kept for backward compatibility but should be removed.
 */

// Re-export from the new organism
export { FileDisplay, type FileDisplayStatus, type FileDisplayProps } from '../organisms/FileDisplay';