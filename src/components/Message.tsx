import { FunctionComponent } from 'preact';
import { memo } from 'preact/compat';
import { useState, useEffect } from 'preact/hooks';
import DOMPurify from 'dompurify';
import {
	DocumentIcon,
	DocumentTextIcon,
	TableCellsIcon,
	MusicalNoteIcon,
	VideoCameraIcon
} from '@heroicons/react/24/outline';
import { FileAttachment } from '../../worker/types';
import { useToastContext } from '../contexts/ToastContext';
import { AIThinkingIndicator } from './AIThinkingIndicator';
import { ContactForm, ContactData } from './ContactForm';
import DocumentChecklist from './DocumentChecklist';
import LawyerSearchResults from './LawyerSearchResults';
import LazyMedia from './LazyMedia';
import MatterCanvas from './MatterCanvas';
import MediaContent from './MediaContent';
import Modal from './Modal';
import PaymentEmbed from './PaymentEmbed';
import PDFGeneration from './PDFGeneration';



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
	contactForm?: {
		fields: string[];
		required: string[];
		message?: string;
	};
	documentChecklist?: {
		matterType: string;
		documents: Array<{
			id: string;
			name: string;
			description?: string;
			required: boolean;
			status: 'missing' | 'uploaded' | 'pending';
			file?: globalThis.File;
		}>;
	};
	lawyerSearchResults?: {
		matterType: string;
		lawyers: Array<{
			id: string;
			name: string;
			firm?: string;
			location: string;
			practiceAreas: string[];
			rating?: number;
			reviewCount?: number;
			phone?: string;
			email?: string;
			website?: string;
			bio?: string;
			experience?: string;
			languages?: string[];
			consultationFee?: number;
			availability?: string;
		}>;
		total: number;
	};
	generatedPDF?: {
		filename: string;
		size: number;
		generatedAt: string;
		matterType: string;
	};
	teamConfig?: {
		name: string;
		profileImage: string | null;
		teamId: string;
	};
	onOpenSidebar?: () => void;
	onContactFormSubmit?: (data: ContactData) => void | Promise<void>;
	isLoading?: boolean;
	aiState?: 'thinking' | 'processing' | 'generating';
	toolMessage?: string;
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
	const handleKeyDown = (e: globalThis.KeyboardEvent) => {
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
	contactForm,
	documentChecklist,
	lawyerSearchResults,
	generatedPDF,
	_teamConfig,
	_onOpenSidebar,
	onContactFormSubmit,
	isLoading,
	aiState,
	toolMessage,
	_id,
	_sessionId,
	_teamId,
	_showFeedback = true,
	_onFeedbackSubmit
}) => {
	const [isClient, setIsClient] = useState(false);
	const { showSuccess, showError, showInfo } = useToastContext();
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
			.catch((_error) => {
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
		} ${hasOnlyMedia ? 'p-0 m-0 bg-none' : ''}`} data-testid={isUser ? "user-message" : "ai-message"}>
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
						toolMessage={toolMessage}
					/>
				)}
				

				
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
							// Handle payment completion
							showSuccess('Payment received', `Payment ${paymentId} completed successfully.`);
							
							// TODO: Trigger scheduling flow separately if needed
							// This could be handled by the parent component or a separate service
							// showInfo('Scheduling', 'We will contact you shortly to schedule your consultation.');
						}}
					/>
				)}
				
				{/* Display contact form */}
				{contactForm && onContactFormSubmit && (
					<ContactForm
						fields={contactForm.fields}
						required={contactForm.required}
						message={contactForm.message}
						onSubmit={onContactFormSubmit}
					/>
				)}
				
				{/* Display document checklist */}
				{documentChecklist && (
					<DocumentChecklist
						matterType={documentChecklist.matterType}
						documents={documentChecklist.documents}
						onDocumentUpload={(documentId, file) => {
							// Handle document upload
							if (file) {
								// In a real implementation, this would upload to a file service
								showSuccess('Document Uploaded', `Document "${file.name}" uploaded successfully for ${documentId}`);
							}
						}}
						onDocumentRemove={(documentId) => {
							// Handle document removal
							showInfo('Document Removed', `Document ${documentId} removed from checklist`);
						}}
						onComplete={() => {
							// Handle checklist completion
							showSuccess('Checklist Complete', 'Document checklist completed! You can now proceed with your case.');
						}}
						onSkip={() => {
							// Handle checklist skip
							showInfo('Checklist Skipped', 'Document checklist skipped. You can return to it later if needed.');
						}}
					/>
				)}

				{/* Display lawyer search results */}
				{lawyerSearchResults && (
					<LawyerSearchResults
						matterType={lawyerSearchResults.matterType}
						lawyers={lawyerSearchResults.lawyers}
						total={lawyerSearchResults.total}
						onContactLawyer={(lawyer) => {
							// Open lawyer contact options
							if (lawyer.phone) {
								globalThis.open(`tel:${lawyer.phone}`, '_self');
							} else if (lawyer.email) {
								globalThis.open(`mailto:${lawyer.email}?subject=Legal Consultation Request`, '_self');
							} else if (lawyer.website) {
								globalThis.open(lawyer.website, '_blank');
							} else {
								showInfo('Contact Information', `Contact ${lawyer.name} at ${lawyer.firm || 'their firm'} for a consultation.`);
							}
						}}
						onSearchAgain={() => {
							// Trigger new lawyer search
							showInfo('New Search', 'Please ask the AI to search for lawyers again with different criteria.');
						}}
					/>
				)}

				{/* Display PDF generation */}
				{generatedPDF && (
					<PDFGeneration
						pdf={generatedPDF}
						onDownload={async () => {
							try {
								// Show loading state
								showInfo('Downloading PDF', 'Preparing your case summary for download...');
								
								// Request PDF from backend
								const response = await globalThis.fetch('/api/pdf/download', {
									method: 'POST',
									headers: {
										'Content-Type': 'application/json',
									},
									body: JSON.stringify({
										filename: generatedPDF.filename,
										matterType: generatedPDF.matterType,
										generatedAt: generatedPDF.generatedAt
									})
								});

								if (!response.ok) {
									throw new Error(`Failed to download PDF: ${response.statusText}`);
								}

								// Get the PDF blob
								const pdfBlob = await response.blob();
								
								// Create download link
								const url = globalThis.URL.createObjectURL(pdfBlob);
								const a = globalThis.document.createElement('a');
								a.href = url;
								a.download = generatedPDF.filename;
								globalThis.document.body.appendChild(a);
								a.click();
								globalThis.document.body.removeChild(a);
								globalThis.URL.revokeObjectURL(url);
								
								showSuccess('PDF Downloaded', 'Your case summary has been downloaded successfully.');
							} catch (_error) {
								showError('Download Failed', 'Unable to download PDF. Please try again or contact support.');
							}
						}}
						onRegenerate={async () => {
							showInfo('Regenerating PDF', 'Requesting a new PDF generation...');
							
							try {
								// Direct API call to regenerate PDF
								const response = await globalThis.fetch('/api/pdf/regenerate', {
									method: 'POST',
									headers: { 
										'Content-Type': 'application/json' 
									},
									body: JSON.stringify({
										filename: generatedPDF.filename,
										matterType: generatedPDF.matterType,
										generatedAt: generatedPDF.generatedAt
									})
								});

								if (!response.ok) {
									throw new Error(`Failed to regenerate PDF: ${response.statusText}`);
								}

								const _result = await response.json();
								showSuccess('PDF Regenerated', 'Your case summary has been regenerated successfully.');
								
								// Optionally trigger a re-render or update the PDF data
								// This could be handled by the parent component
							} catch (_error) {
								showError('Regeneration Failed', 'Unable to regenerate PDF. Please try again or contact support.');
							}
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
						key={`other-${index}`} 
						file={file} 
						onFileClick={(file) => {
							// For documents and other files, trigger download
							const link = globalThis.document.createElement('a');
							link.href = file.url;
							link.download = file.name;
							link.click();
						}}
					/>
				))}
				{audioFiles.map((file, index) => (
					<div key={`audio-${index}`} className="my-2 rounded-xl overflow-hidden max-w-75 w-full">
						<LazyMedia
							src={file.url}
							type={file.type}
							alt={file.name}
							className="w-full h-auto block cursor-pointer"
						/>
					</div>
				))}
				{videoFiles.map((file, index) => (
					<div key={`video-${index}`} className="my-2 rounded-xl overflow-hidden max-w-75 w-full">
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