import { FunctionComponent } from 'preact';
import { memo } from 'preact/compat';
import { useState, useEffect } from 'preact/hooks';
import DOMPurify from 'dompurify';
import LazyMedia from './LazyMedia';
import Modal from './Modal';
import MediaContent from './MediaContent';
import PaymentContent from './PaymentContent';
import MatterCanvas from './MatterCanvas';
import PaymentEmbed from './PaymentEmbed';
import TeamProfile from './TeamProfile';
import { Button } from './ui/Button';
import { AIThinkingIndicator } from './AIThinkingIndicator';
import { features } from '../config/features';
import {
	DocumentIcon,
	DocumentTextIcon,
	TableCellsIcon,
	MusicalNoteIcon,
	VideoCameraIcon,
	ClipboardDocumentIcon
} from '@heroicons/react/24/outline';
import { FileAttachment } from '../../worker/types';

// Agent handles all scheduling and matter creation - no lazy components needed

// Agent handles all scheduling and matter creation - no interfaces needed

interface MessageProps {
	content: string;
	isUser: boolean;
	files?: FileAttachment[];
	matterCanvas?: {
		matterId?: string;
		matterNumber?: string;
		service: string;
		matterSummary: string;
		answers?: Record<string, string>;
		isExpanded?: boolean;
	};
	paymentEmbed?: {
		paymentUrl: string;
		amount?: number;
		description?: string;
		paymentId?: string;
	};
	teamConfig?: {
		name: string;
		profileImage: string | null;
		teamId: string;
	};
	onOpenSidebar?: () => void;
	isLoading?: boolean;
	aiState?: 'thinking' | 'processing' | 'generating';
	// Feedback props
	id?: string;
	sessionId?: string;
	teamId?: string;
	showFeedback?: boolean;
	onFeedbackSubmit?: (feedback: any) => void;
}

const formatFileSize = (bytes: number): string => {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const getFileIcon = (file: FileAttachment) => {
	// Get file extension
			const ext = file.name.split('.').pop()?.toLowerCase();
	
	// PDF icon
	if (file.type === 'application/pdf' || ext === 'pdf') {
		return (
			<DocumentTextIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
		);
	}
	
	// Word document icon
	if (file.type === 'application/msword' ||
		file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
		ext === 'doc' || ext === 'docx') {
		return (
			<DocumentIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
		);
	}
	
	// Excel spreadsheet icon
	if (file.type === 'application/vnd.ms-excel' ||
		file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
		ext === 'xls' || ext === 'xlsx' || ext === 'csv') {
		return (
			<TableCellsIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
		);
	}
	
	// Audio file icon
	if (file.type.startsWith('audio/')) {
		return (
			<MusicalNoteIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
		);
	}
	
	// Video file icon
	if (file.type.startsWith('video/')) {
		return (
			<VideoCameraIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
		);
	}
	
	// Default file icon
	return (
		<DocumentIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
	);
};

const FilePreview: FunctionComponent<{ file: FileAttachment; onFileClick: (file: FileAttachment) => void }> = ({ file, onFileClick }) => {
	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
			e.preventDefault();
			onFileClick(file);
		}
	};

	return (
		<div 
			className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 cursor-pointer my-2 max-w-[300px]"
			onClick={() => onFileClick(file)}
			onKeyDown={handleKeyDown}
			role="button"
			tabIndex={0}
			aria-label={`Open ${file.name}`}
		>
			<div className="w-8 h-8 rounded bg-gray-100 dark:bg-dark-hover flex items-center justify-center flex-shrink-0">
				{getFileIcon(file)}
			</div>
			<div className="flex-1 min-w-0">
				<div className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap overflow-hidden text-ellipsis" title={file.name}>
					{file.name.length > 25 ? `${file.name.substring(0, 25)}...` : file.name}
				</div>
				<div className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(file.size)}</div>
			</div>
		</div>
	);
};

const ImagePreview: FunctionComponent<{ file: FileAttachment; onImageClick: (file: FileAttachment) => void }> = ({ file, onImageClick }) => {
	return (
		<div className="message-media-container my-2">
			<LazyMedia
				src={file.url}
				type={file.type}
				alt={file.name}
				className="max-w-[300px] max-h-[300px] w-auto h-auto block cursor-pointer rounded-lg border border-gray-200 dark:border-gray-700"
				onClick={() => onImageClick(file)}
			/>
		</div>
	);
};

// Agent handles service selection - no component needed

// Agent handles urgency selection - no component needed

// Agent handles welcome messages - no component needed

const Message: FunctionComponent<MessageProps> = memo(({ 
	content, 
	isUser, 
	files = [], 
	matterCanvas,
	paymentEmbed,
	teamConfig,
	onOpenSidebar,
	isLoading,
	aiState,
	id,
	sessionId,
	teamId,
	showFeedback = true,
	onFeedbackSubmit
}) => {
	const [isClient, setIsClient] = useState(false);
	const [ReactMarkdown, setReactMarkdown] = useState<any>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [selectedMedia, setSelectedMedia] = useState<any>(null);

	useEffect(() => {
		setIsClient(true);
		// Dynamically import ReactMarkdown only on the client side
		import('react-markdown')
			.then((module) => {
				setReactMarkdown(() => module.default);
			})
			.catch((error) => {
				console.error('Failed to load ReactMarkdown:', error);
				// Keep ReactMarkdown as null to use fallback rendering
			});
	}, []);
	const imageFiles = files.filter(file => file.type.startsWith('image/'));
	const audioFiles = files.filter(file => file.type.startsWith('audio/'));
	const videoFiles = files.filter(file => file.type.startsWith('video/'));
	const otherFiles = files.filter(file => 
		!file.type.startsWith('image/') && 
		!file.type.startsWith('audio/') && 
		!file.type.startsWith('video/')
	);
	
	const hasOnlyMedia = files.length > 0 && !content && files.every(file => 
		file.type.startsWith('image/') || 
		file.type.startsWith('video/') || 
		file.type.startsWith('audio/')
	);



	return (
		<div className={`flex flex-col max-w-full my-4 px-3 py-2 rounded-xl break-words relative ${
			isUser 
				? 'ml-auto mr-0 bg-light-message-bg-user dark:bg-dark-message-bg-user text-light-text dark:text-dark-text w-fit' 
				: 'mr-0 ml-0 w-full min-h-12 min-w-30'
		} ${hasOnlyMedia ? 'p-0 m-0 bg-none' : ''}`}>
			{/* Agent handles welcome messages - no special logic needed */}
			<div className="text-base leading-6 min-h-4">
				{/* Show content if available and not loading */}
				{content && !isLoading && (
					<div className="prose prose-xs sm:prose-sm md:prose-base lg:prose-lg max-w-none dark:prose-invert prose-headings:font-semibold prose-p:leading-relaxed prose-ul:leading-relaxed prose-ol:leading-relaxed">
						{isClient && ReactMarkdown ? (
							<ReactMarkdown>{content}</ReactMarkdown>
						) : (
							<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />
						)}
					</div>
				)}
				
				{/* Show AI thinking indicator for all loading states */}
				{isLoading && (
					<AIThinkingIndicator 
						variant={aiState || 'thinking'} 
						content={content || undefined}
					/>
				)}
				
				{/* Then display scheduling components */}
				{/* Agent handles all scheduling - no components needed */}
				
				{/* Display matter canvas */}
				{matterCanvas && (
					<MatterCanvas
						matterId={matterCanvas.matterId}
						matterNumber={matterCanvas.matterNumber}
						service={matterCanvas.service}
						matterSummary={matterCanvas.matterSummary}
						answers={matterCanvas.answers || {}}
					/>
				)}
				
				{/* Display payment embed */}
				{paymentEmbed && (
					<PaymentEmbed
							paymentUrl={paymentEmbed.paymentUrl}
							amount={paymentEmbed.amount}
							description={paymentEmbed.description}
							onPaymentComplete={(paymentId) => {
								console.log('Payment completed:', paymentId);
								// TODO: Handle payment completion
							}}
					/>
				)}
				
				{/* Agent handles all matter creation and welcome messages - no components needed */}
				
				{/* Display files */}
				{imageFiles.map((file, index) => (
					<ImagePreview 
						key={file.url || index} 
						file={file} 
						onImageClick={(file) => {
							setSelectedMedia({
								id: file.url,
								name: file.name,
								size: file.size,
								type: file.type,
								url: file.url,
								timestamp: new Date(),
								messageIndex: 0,
								category: 'image' as const
							});
							setIsModalOpen(true);
						}}
					/>
				))}
				
				{otherFiles.map((file, index) => (
					<FilePreview 
						key={index} 
						file={file} 
						onFileClick={(file) => {
							// For documents and other files, trigger download
							const link = document.createElement('a');
							link.href = file.url;
							link.download = file.name;
							link.click();
						}}
					/>
				))}
				{audioFiles.map((file, index) => (
					<div className="my-2 rounded-xl overflow-hidden max-w-75 w-full">
						<LazyMedia
							src={file.url}
							type={file.type}
							alt={file.name}
							className="w-full h-auto block cursor-pointer"
						/>
					</div>
				))}
				{videoFiles.map((file, index) => (
					<div className="my-2 rounded-xl overflow-hidden max-w-75 w-full">
						<LazyMedia
							src={file.url}
							type={file.type}
							alt={file.name}
							className="w-full h-auto block cursor-pointer"
						/>
					</div>
				))}
				
				{/* Modal for viewing images */}
				{isModalOpen && selectedMedia && (
					<Modal
						isOpen={isModalOpen}
						onClose={() => {
							setIsModalOpen(false);
							setSelectedMedia(null);
						}}
						type="fullscreen"
						showCloseButton={true}
					>
						<MediaContent media={selectedMedia} />
					</Modal>
				)}
			</div>
		</div>
	);
});

export default Message; 