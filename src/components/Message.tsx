import { FunctionComponent } from 'preact';
import { memo } from 'preact/compat';
import { marked } from 'marked';
import LazyMedia from './LazyMedia';
import createLazyComponent from '../utils/LazyComponent';
import CaseQualityScore from './CaseQualityScore';

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

// Add case creation-related data interface
interface CaseCreationData {
	type: 'service-selection' | 'urgency-selection';
	availableServices: string[];
}

interface MessageProps {
	content: string;
	isUser: boolean;
	files?: FileAttachment[];
	scheduling?: SchedulingData;
	caseCreation?: CaseCreationData;
	qualityScore?: {
		score: number;
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
		readyForLawyer: boolean;
		badge: 'Poor' | 'Fair' | 'Good' | 'Excellent';
		color: 'red' | 'yellow' | 'green' | 'blue';
	};
	onDateSelect?: (date: Date) => void;
	onTimeOfDaySelect?: (timeOfDay: 'morning' | 'afternoon') => void;
	onTimeSlotSelect?: (timeSlot: Date) => void;
	onRequestMoreDates?: () => void;
	onServiceSelect?: (service: string) => void;
	onUrgencySelect?: (urgency: string) => void;
	isLoading?: boolean;
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
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="message-file-icon">
				<path fill="currentColor" d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm12 6V9c0-.55-.45-1-1-1h-2v5h2c.55 0 1-.45 1-1zm-2-3h1v3h-1V9zm4 2h1v-1h-1V9h1V8h-2v5h1v-1zm-8 0h1c.55 0 1-.45 1-1V9c0-.55-.45-1-1-1H9v5h1v-2zm0-2h1v1h-1V9z"/>
			</svg>
		);
	}
	
	// Word document icon
	if (file.type === 'application/msword' || 
		file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
		ext === 'doc' || ext === 'docx') {
		return (
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="message-file-icon">
				<path fill="currentColor" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6zm10-9h-4v1h4v-1zm0 3H8v1h8v-1zm0 3H8v1h8v-1z"/>
			</svg>
		);
	}
	
	// Excel spreadsheet icon
	if (file.type === 'application/vnd.ms-excel' || 
		file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
		ext === 'xls' || ext === 'xlsx' || ext === 'csv') {
		return (
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="message-file-icon">
				<path fill="currentColor" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6zm7-7H8v-2h5v2zm0 4H8v-2h5v2zm2-2v-2h2v2h-2zm0 4v-2h2v2h-2z"/>
			</svg>
		);
	}
	
	// Audio file icon
	if (file.type.startsWith('audio/')) {
		return (
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="message-file-icon">
				<path fill="currentColor" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6zm-2 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
			</svg>
		);
	}
	
	// Video file icon
	if (file.type.startsWith('video/')) {
		return (
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="message-file-icon">
				<path fill="currentColor" d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z"/>
			</svg>
		);
	}
	
	// Default file icon
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			class="message-file-icon"
		>
			<path
				fill="currentColor"
				d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"
			/>
		</svg>
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

const Message: FunctionComponent<MessageProps> = memo(({ 
	content, 
	isUser, 
	files = [], 
	scheduling, 
	caseCreation,
	qualityScore,
	onDateSelect, 
	onTimeOfDaySelect, 
	onTimeSlotSelect, 
	onRequestMoreDates,
	onServiceSelect,
	onUrgencySelect,
	isLoading
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
				
				{/* Display case creation components */}
				{caseCreation && caseCreation.type === 'service-selection' && onServiceSelect && (
					<ServiceSelectionButtons
						services={caseCreation.availableServices}
						onServiceSelect={onServiceSelect}
					/>
				)}
				{caseCreation && caseCreation.type === 'urgency-selection' && onUrgencySelect && (
					<UrgencySelectionButtons
						onUrgencySelect={onUrgencySelect}
					/>
				)}
				
				{/* Display quality score */}
				{qualityScore && (
					<CaseQualityScore
						score={qualityScore.score}
						breakdown={qualityScore.breakdown}
						suggestions={qualityScore.suggestions}
						readyForLawyer={qualityScore.readyForLawyer}
						badge={qualityScore.badge}
						color={qualityScore.color}
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
			</div>
		</div>
	);
});

export default Message; 