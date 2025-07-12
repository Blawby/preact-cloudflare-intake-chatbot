/**
 * Feature flags configuration
 * 
 * This file contains feature flags that can be toggled to enable/disable
 * specific features in the application without code changes.
 */

interface FeatureFlags {
    /**
     * Enable audio recording feature
     * When false, the audio recording button will be hidden from the UI
     */
    enableAudioRecording: boolean;

    /**
     * Enable video recording feature (future)
     * Not currently implemented in the UI
     */
    enableVideoRecording: boolean;

    /**
     * Enable file attachments
     * When false, file upload functionality will be hidden
     */
    enableFileAttachments: boolean;

    /**
     * Enable left sidebar
     * When false, the left column will be hidden and the layout will be 2-column
     */
    enableLeftSidebar: boolean;
}

const features: FeatureFlags = {
    enableAudioRecording: false, // Set to false to hide voice recording
    enableVideoRecording: false, // Not implemented yet
    enableFileAttachments: true, // File attachments are enabled
    enableLeftSidebar: false, // Set to false to hide left sidebar for now
};

// For development environment, you can override settings
if (import.meta.env.DEV) {
    // Enable all features in development if needed
    // features.enableAudioRecording = true; 
}

export default features; 