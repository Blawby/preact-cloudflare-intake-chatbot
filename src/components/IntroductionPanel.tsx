import { FunctionComponent } from 'preact';
import Modal from './Modal';
import { Button } from './ui/Button';

interface IntroductionPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const IntroductionPanel: FunctionComponent<IntroductionPanelProps> = ({ isOpen, onClose }) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Welcome to the Chat Interface!"
        >
            <div class="introduction-content">
                <section class="intro-section">
                    <h3>🚀 Getting Started</h3>
                    <p>Welcome to our modern chat interface! Here's what you can do:</p>
                </section>

                <section class="intro-section">
                    <h3>💬 Basic Features</h3>
                    <ul>
                        <li>Send text messages with Markdown support</li>
                        <li>Code syntax highlighting</li>
                        <li>Dark/light theme support</li>
                    </ul>
                </section>

                <section class="intro-section">
                    <h3>📎 Media Support</h3>
                    <ul>
                        <li>Upload files (images, documents, etc.)</li>
                        <li>Record audio messages</li>
                        <li>Record video messages</li>
                    </ul>
                </section>

                <section class="intro-section">
                    <h3>⌨️ Keyboard Shortcuts</h3>
                    <ul>
                        <li><kbd>Enter</kbd> - Send message</li>
                        <li><kbd>Shift</kbd> + <kbd>Enter</kbd> - New line</li>
                        <li><kbd>Esc</kbd> - Close modals</li>
                    </ul>
                </section>

                <Button variant="primary" onClick={onClose}>
                    Get Started
                </Button>
            </div>
        </Modal>
    );
};

export default IntroductionPanel; 