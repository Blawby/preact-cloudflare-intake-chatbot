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
            <div class="flex flex-col gap-6">
                <section class="flex flex-col gap-3">
                    <h3 class="text-xl font-semibold m-0 flex items-center gap-2">🚀 Getting Started</h3>
                    <p class="text-base leading-6">Welcome to our modern chat interface! Here's what you can do:</p>
                </section>

                <section class="flex flex-col gap-3">
                    <h3 class="text-xl font-semibold m-0 flex items-center gap-2">💬 Basic Features</h3>
                    <ul class="list-none p-0 m-0">
                        <li class="my-2 flex items-center gap-2">
                            <span class="text-accent">•</span>
                            Send text messages with Markdown support
                        </li>
                        <li class="my-2 flex items-center gap-2">
                            <span class="text-accent">•</span>
                            Code syntax highlighting
                        </li>
                        <li class="my-2 flex items-center gap-2">
                            <span class="text-accent">•</span>
                            Dark/light theme support
                        </li>
                    </ul>
                </section>

                <section class="flex flex-col gap-3">
                    <h3 class="text-xl font-semibold m-0 flex items-center gap-2">📎 Media Support</h3>
                    <ul class="list-none p-0 m-0">
                        <li class="my-2 flex items-center gap-2">
                            <span class="text-accent">•</span>
                            Upload files (images, documents, etc.)
                        </li>
                        <li class="my-2 flex items-center gap-2">
                            <span class="text-accent">•</span>
                            Record audio messages
                        </li>
                        <li class="my-2 flex items-center gap-2">
                            <span class="text-accent">•</span>
                            Record video messages
                        </li>
                    </ul>
                </section>

                <section class="flex flex-col gap-3">
                    <h3 class="text-xl font-semibold m-0 flex items-center gap-2">⌨️ Keyboard Shortcuts</h3>
                    <ul class="list-none p-0 m-0">
                        <li class="my-2 flex items-center gap-2">
                            <span class="text-accent">•</span>
                            <kbd class="bg-light-input-bg dark:bg-dark-input-bg border border-light-border dark:border-dark-border rounded px-1.5 py-0.5 text-sm font-mono">Enter</kbd> - Send message
                        </li>
                        <li class="my-2 flex items-center gap-2">
                            <span class="text-accent">•</span>
                            <kbd class="bg-light-input-bg dark:bg-dark-input-bg border border-light-border dark:border-dark-border rounded px-1.5 py-0.5 text-sm font-mono">Shift</kbd> + <kbd class="bg-light-input-bg dark:bg-dark-input-bg border border-light-border dark:border-dark-border rounded px-1.5 py-0.5 text-sm font-mono">Enter</kbd> - New line
                        </li>
                        <li class="my-2 flex items-center gap-2">
                            <span class="text-accent">•</span>
                            <kbd class="bg-light-input-bg dark:bg-dark-input-bg border border-light-border dark:border-dark-border rounded px-1.5 py-0.5 text-sm font-mono">Esc</kbd> - Close modals
                        </li>
                    </ul>
                </section>

                <Button variant="primary" onClick={onClose} className="mt-4 self-center">
                    Get Started
                </Button>
            </div>
        </Modal>
    );
};

export default IntroductionPanel; 