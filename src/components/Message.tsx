import { FunctionComponent } from 'preact';
import { memo } from 'preact/compat';
import { marked } from 'marked';
import LazyMedia from './LazyMedia';
import MatterCanvas from './MatterCanvas';
import FeedbackUI from './FeedbackUI';
import TeamProfile from './TeamProfile';
import createLazyComponent from '../utils/LazyComponent';
import features from '../config/features';
import {
	DocumentIcon,
	DocumentTextIcon,
	TableCellsIcon,
	MusicalNoteIcon,
	VideoCameraIcon,
	ClipboardDocumentIcon
} from '@heroicons/react/24/outline';
import { useState } from 'preact/hooks';

// Lazy load scheduling components
const LazyDateSelector = createLazyComponent(
	() => import('./scheduling/DateSelector'),
	'DateSelector'
);

const LazyTimeOfDaySelector = createLazyComponent(
	() => import('./scheduling/TimeOfDaySelector'),
	'TimeOfDaySelector'
);

const LazyTimeSlotSelector = createLazyComponent(
	() => import('./scheduling/TimeSlotSelector'),
	'TimeSlotSelector'
);

const LazyScheduleConfirmation = createLazyComponent(
	() => import('./scheduling/ScheduleConfirmation'),
	'ScheduleConfirmation'
);

// Set options for marked
marked.setOptions({
	breaks: true,
	gfm: true
});

interface FileAttachment {
	name: string;
	size: number;
	type: string;
	url: string;
}

// Add scheduling-related data interface
interface SchedulingData {
	type: 'date-selection' | 'time-of-day-selection' | 'time-slot-selection' | 'confirmation';
	selectedDate?: Date;
	timeOfDay?: 'morning' | 'afternoon';
	scheduledDateTime?: Date;
}

// Add matter creation-related data interface
interface MatterCreationData {
	type: 'service-selection' | 'urgency-selection' | 'ai-questions';
	availableServices: string[];
	question?: string;
	totalQuestions?: number;
	currentQuestionIndex?: number;
}

interface MessageProps {
	content: string;
	isUser: boolean;
	files?: FileAttachment[];
	scheduling?: SchedulingData;
	matterCreation?: MatterCreationData;
	welcomeMessage?: {
		showButtons: boolean;
	};
	matterCanvas?: {
		service: string;
		matterSummary: string;
		qualityScore?: {
			score: number;
			badge: 'Excellent' | 'Good' | 'Fair' | 'Poor';
			color: 'blue' | 'green' | 'yellow' | 'red';
			inferredUrgency: string;
			breakdown: {
				followUpCompletion: number;
				requiredFields: number;
				evidence: number;
				clarity: number;
				urgency: number;
				consistency: number;
				aiConfidence: number;
			};
			suggestions: string[];
		};
		answers?: Record<string, string>;
		isExpanded?: boolean;
	};
	onDateSelect?: (date: Date) => void;
	onTimeOfDaySelect?: (timeOfDay: 'morning' | 'afternoon') => void;
	onTimeSlotSelect?: (timeSlot: Date) => void;
	onRequestMoreDates?: () => void;
	onServiceSelect?: (service: string) => void;
	onUrgencySelect?: (urgency: string) => void;
	onCreateMatter?: () => void;
	onScheduleConsultation?: () => void;
	onLearnServices?: () => void;
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
			<DocumentTextIcon className="message-file-icon" />
		);
	}
	
	// Word document icon
	if (file.type === 'application/msword' ||
		file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
		ext === 'doc' || ext === 'docx') {
		return (
			<DocumentIcon className="message-file-icon" />
		);
	}
	
	// Excel spreadsheet icon
	if (file.type === 'application/vnd.ms-excel' ||
		file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
		ext === 'xls' || ext === 'xlsx' || ext === 'csv') {
		return (
			<TableCellsIcon className="message-file-icon" />
		);
	}
	
	// Audio file icon
	if (file.type.startsWith('audio/')) {
		return (
			<MusicalNoteIcon className="message-file-icon" />
		);
	}
	
	// Video file icon
	if (file.type.startsWith('video/')) {
		return (
			<VideoCameraIcon className="message-file-icon" />
		);
	}
	
	// Default file icon
	return (
		<DocumentIcon className="message-file-icon" />
	);
};

const FilePreview: FunctionComponent<{ file: FileAttachment }> = ({ file }) => {
	return (
		<div class="message-file">
			{getFileIcon(file)}
			<div class="message-file-info">
				<div class="message-file-name">
					<a href={file.url} target="_blank" rel="noopener noreferrer">
						{file.name}
					</a>
				</div>
				<div class="message-file-size">{formatFileSize(file.size)}</div>
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
				className="message-media"
			/>
		</div>
	);
};

// Service selection buttons component
const ServiceSelectionButtons: FunctionComponent<{ 
	services: string[]; 
	onServiceSelect: (service: string) => void;
}> = ({ services, onServiceSelect }) => {
	// Format service names for display
	const formatServiceName = (service: string) => {
		return service
			.split('-')
							.map(word => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	};

	return (
		<div class="service-selection-container">
			<div class="service-buttons">
				{services.map((service, index) => (
					<button
						key={index}
						class="time-slot-button"
						onClick={() => onServiceSelect(service)}
					>
						{formatServiceName(service)}
					</button>
				))}
				<button
					class="time-slot-button"
					onClick={() => onServiceSelect('General Inquiry')}
				>
					General Inquiry
				</button>
			</div>
		</div>
	);
};

// Urgency selection buttons component
const UrgencySelectionButtons: FunctionComponent<{ 
	onUrgencySelect: (urgency: string) => void;
}> = ({ onUrgencySelect }) => {
	const urgencyOptions = [
		{
			label: 'Very Urgent',
			description: 'Immediate action needed'
		},
		{
			label: 'Somewhat Urgent',
			description: 'Within a few weeks'
		},
		{
			label: 'Not Urgent',
			description: 'Can wait a month or more'
		}
	];

	return (
		<div class="service-selection-container">
			<div class="service-buttons">
				{urgencyOptions.map((option, index) => (
					<button
						key={index}
						class="time-slot-button"
						onClick={() => onUrgencySelect(option.label)}
					>
						<div>
							<div style="font-weight: 600; margin-bottom: 2px;">{option.label}</div>
							<div style="font-size: 12px; color: var(--accent-color);">{option.description}</div>
						</div>
					</button>
				))}
			</div>
		</div>
	);
};

// Welcome message buttons component
const WelcomeMessageButtons: FunctionComponent<{ 
	onCreateMatter?: () => void;
	onScheduleConsultation?: () => void;
	onLearnServices?: () => void;
}> = ({ onCreateMatter, onScheduleConsultation, onLearnServices }) => {
	return (
		<div class="welcome-buttons-container">
			<div class="welcome-buttons">
				{onCreateMatter && (
					<button
						class="welcome-button primary"
						onClick={onCreateMatter}
					>
						Create Matter
					</button>
				)}
				{onScheduleConsultation && (
					<button
						class="welcome-button"
						onClick={onScheduleConsultation}
					>
						Request a consultation
					</button>
				)}
				{onLearnServices && (
					<button
						class="welcome-button"
						onClick={onLearnServices}
					>
						Learn about our services
					</button>
				)}
			</div>
		</div>
	);
};

const Message: FunctionComponent<MessageProps> = memo(({ 
	content, 
	isUser, 
	files = [], 
	scheduling, 
	matterCreation,
	welcomeMessage,
	matterCanvas,
	onDateSelect, 
	onTimeOfDaySelect, 
	onTimeSlotSelect, 
	onRequestMoreDates,
	onServiceSelect,
	onUrgencySelect,
	onCreateMatter,
	onScheduleConsultation,
	onLearnServices,
	teamConfig,
	onOpenSidebar,
	isLoading,
	id,
	sessionId,
	teamId,
	showFeedback = true,
	onFeedbackSubmit
}) => {
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
		<div class={`message ${isUser ? 'message-user' : 'message-ai'} ${hasOnlyMedia ? 'media-only' : ''}`}>
			{/* Show team profile for welcome message without content */}
			{welcomeMessage && !welcomeMessage.showButtons && !content && teamConfig && (
				<div class="welcome-profile">
					<TeamProfile
						name={teamConfig.name}
						profileImage={teamConfig.profileImage}
						teamId={teamConfig.teamId}
						variant="welcome"
						showVerified={true}
						onClick={onOpenSidebar}
					/>
				</div>
			)}
			<div class="message-content">
				{/* Show loading indicator if this message is loading */}
				{isLoading ? (
					<div class="loading-indicator">
						<span class="dot"></span>
						<span class="dot"></span>
						<span class="dot"></span>
					</div>
				) : (
					/* Render message content first */
					content && (
						<div dangerouslySetInnerHTML={{ __html: marked(content) }} />
					)
				)}
				
				{/* Then display scheduling components */}
				{scheduling && (
					<div class="scheduling-container">
						{scheduling.type === 'date-selection' && onDateSelect && onRequestMoreDates && (
							<LazyDateSelector
								onDateSelect={onDateSelect}
								onRequestMoreDates={onRequestMoreDates}
								startDate={scheduling.selectedDate}
							/>
						)}
						
						{scheduling.type === 'time-of-day-selection' && scheduling.selectedDate && onTimeOfDaySelect && (
							<LazyTimeOfDaySelector
								selectedDate={scheduling.selectedDate}
								onTimeOfDaySelect={onTimeOfDaySelect}
							/>
						)}
						
						{scheduling.type === 'time-slot-selection' && scheduling.selectedDate && 
						 scheduling.timeOfDay && onTimeSlotSelect && (
							<LazyTimeSlotSelector
								selectedDate={scheduling.selectedDate}
								timeOfDay={scheduling.timeOfDay}
								onTimeSlotSelect={onTimeSlotSelect}
							/>
						)}
						
						{scheduling.type === 'confirmation' && scheduling.scheduledDateTime && (
							<LazyScheduleConfirmation
								scheduledDateTime={scheduling.scheduledDateTime}
							/>
						)}
					</div>
				)}
				
				{/* Display matter canvas */}
				{matterCanvas && (
					<MatterCanvas
						matterId={matterCanvas.matterId}
						matterNumber={matterCanvas.matterNumber}
						service={matterCanvas.service}
						matterSummary={matterCanvas.matterSummary}
						qualityScore={matterCanvas.qualityScore}
						answers={matterCanvas.answers}
					/>
				)}
				
				{/* Display matter creation components */}
				{matterCreation && matterCreation.type === 'service-selection' && onServiceSelect && (
					<ServiceSelectionButtons
						services={matterCreation.availableServices}
						onServiceSelect={onServiceSelect}
					/>
				)}
				{matterCreation && matterCreation.type === 'urgency-selection' && onUrgencySelect && (
					<UrgencySelectionButtons
						onUrgencySelect={onUrgencySelect}
					/>
				)}
				
				{/* Display welcome message buttons */}
				{welcomeMessage && welcomeMessage.showButtons && (
					<WelcomeMessageButtons
						onCreateMatter={onCreateMatter}
						onScheduleConsultation={onScheduleConsultation}
						onLearnServices={onLearnServices}
					/>
				)}
				
				{/* Display files */}
				{imageFiles.map(file => (
					<ImagePreview key={file.url} file={file} />
				))}
				
				{otherFiles.map((file, index) => (
					<FilePreview key={index} file={file} />
				))}
				{audioFiles.map((file, index) => (
					<div class="message-media-container">
						<LazyMedia
							src={file.url}
							type={file.type}
							alt={file.name}
							className="message-media"
						/>
					</div>
				))}
				{videoFiles.map((file, index) => (
					<div class="message-media-container">
						<LazyMedia
							src={file.url}
							type={file.type}
							alt={file.name}
							className="message-media"
						/>
					</div>
				))}
				{imageFiles.map((file, index) => (
					<ImagePreview key={index} file={file} />
				))}
				
				{/* Show feedback UI only on AI messages and when not loading */}
				{!isUser && !isLoading && showFeedback && features.enableMessageFeedback && (
					<FeedbackUI
						messageId={id}
						sessionId={sessionId}
						teamId={teamId}
						onFeedbackSubmit={onFeedbackSubmit}
						content={content}
					/>
				)}
			</div>
		</div>
	);
});

export default Message; 