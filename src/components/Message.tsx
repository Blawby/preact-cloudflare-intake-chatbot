import { FunctionComponent } from 'preact';
import { memo } from 'preact/compat';
import { useState, useEffect } from 'preact/hooks';
import DOMPurify from 'dompurify';
import LazyMedia from './LazyMedia';
import MatterCanvas from './MatterCanvas';
import PaymentEmbed from './PaymentEmbed';
import TeamProfile from './TeamProfile';
import { Button } from './ui/Button';
import features from '../config/features';
import {
	DocumentIcon,
	DocumentTextIcon,
	TableCellsIcon,
	MusicalNoteIcon,
	VideoCameraIcon,
	ClipboardDocumentIcon
} from '@heroicons/react/24/outline';

// Agent handles all scheduling and matter creation - no lazy components needed

interface FileAttachment {
	name: string;
	size: number;
	type: string;
	url: string;
}

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
			<DocumentTextIcon className="w-6 h-6" />
		);
	}
	
	// Word document icon
	if (file.type === 'application/msword' ||
		file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
		ext === 'doc' || ext === 'docx') {
		return (
			<DocumentIcon className="w-6 h-6" />
		);
	}
	
	// Excel spreadsheet icon
	if (file.type === 'application/vnd.ms-excel' ||
		file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
		ext === 'xls' || ext === 'xlsx' || ext === 'csv') {
		return (
			<TableCellsIcon className="w-6 h-6" />
		);
	}
	
	// Audio file icon
	if (file.type.startsWith('audio/')) {
		return (
			<MusicalNoteIcon className="w-6 h-6" />
		);
	}
	
	// Video file icon
	if (file.type.startsWith('video/')) {
		return (
			<VideoCameraIcon className="w-6 h-6" />
		);
	}
	
	// Default file icon
	return (
		<DocumentIcon className="w-6 h-6" />
	);
};

const FilePreview: FunctionComponent<{ file: FileAttachment }> = ({ file }) => {
	return (
		<div className="flex items-center gap-3 p-0 bg-white dark:bg-dark-input border border-gray-200 dark:border-dark-border rounded-lg my-2 w-full max-w-[300px]">
			<div className="w-8 h-8 p-1 text-gray-900 dark:text-white bg-gray-100 dark:bg-dark-hover rounded flex-shrink-0">
				{getFileIcon(file)}
			</div>
			<div className="flex-1 min-w-0 flex flex-col gap-1">
				<div className="font-medium whitespace-nowrap overflow-hidden text-ellipsis">
					<a href={file.url} target="_blank" rel="noopener noreferrer" className="text-gray-900 dark:text-white no-underline hover:underline">
						{file.name}
					</a>
				</div>
				<div className="text-xs text-amber-500">{formatFileSize(file.size)}</div>
			</div>
		</div>
	);
};

const ImagePreview: FunctionComponent<{ file: FileAttachment }> = ({ file }) => {
	return (
		<div class="message-media-container">
			<LazyMedia
				src={file.url}
				type={file.type}
				alt={file.name}
				className="w-full h-auto block cursor-pointer"
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
	id,
	sessionId,
	teamId,
	showFeedback = true,
	onFeedbackSubmit
}) => {
	const [isClient, setIsClient] = useState(false);
	const [ReactMarkdown, setReactMarkdown] = useState<any>(null);

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
		<div class={`flex flex-col max-w-full my-4 px-3 py-2 rounded-xl break-words relative ${
			isUser 
				? 'ml-auto mr-0 bg-light-message-bg-user dark:bg-dark-message-bg-user text-light-text dark:text-dark-text w-fit' 
				: 'mr-0 ml-0 bg-light-message-bg-ai dark:bg-dark-message-bg-ai w-full min-h-12 min-w-30'
		} ${hasOnlyMedia ? 'p-0 m-0 bg-none' : ''}`}>
			{/* Agent handles welcome messages - no special logic needed */}
			<div class="text-base leading-6 min-h-6">
				{/* Show content if available */}
				{content && (
					<div className="prose prose-xs sm:prose-sm md:prose-base lg:prose-lg max-w-none dark:prose-invert prose-headings:font-semibold prose-p:leading-relaxed prose-ul:leading-relaxed prose-ol:leading-relaxed">
						{isClient && ReactMarkdown ? (
							<ReactMarkdown>{content}</ReactMarkdown>
						) : (
							<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />
						)}
					</div>
				)}
				
				{/* Show typing cursor for streaming content */}
				{isLoading && content && (
					<span class="text-accent font-bold animate-blink ml-0.5">|</span>
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
					<ImagePreview key={file.url || index} file={file} />
				))}
				
				{otherFiles.map((file, index) => (
					<FilePreview key={index} file={file} />
				))}
				{audioFiles.map((file, index) => (
					<div class="my-2 rounded-xl overflow-hidden max-w-75 w-full">
						<LazyMedia
							src={file.url}
							type={file.type}
							alt={file.name}
							className="w-full h-auto block cursor-pointer"
						/>
					</div>
				))}
				{videoFiles.map((file, index) => (
					<div class="my-2 rounded-xl overflow-hidden max-w-75 w-full">
						<LazyMedia
							src={file.url}
							type={file.type}
							alt={file.name}
							className="w-full h-auto block cursor-pointer"
						/>
					</div>
				))}
				
				
				
			</div>
		</div>
	);
});

export default Message; 