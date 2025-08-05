import { FunctionComponent } from 'preact';
import { memo } from 'preact/compat';
import { marked } from 'marked';
import LazyMedia from './LazyMedia';
import MatterCanvas from './MatterCanvas';
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
import { useState } from 'preact/hooks';

// Agent handles all scheduling and matter creation - no lazy components needed

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

// Agent handles all scheduling and matter creation - no interfaces needed

interface MessageProps {
	content: string;
	isUser: boolean;
	files?: FileAttachment[];
	matterCanvas?: {
		service: string;
		matterSummary: string;
		answers?: Record<string, string>;
		isExpanded?: boolean;
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

// Agent handles service selection - no component needed

// Agent handles urgency selection - no component needed

// Agent handles welcome messages - no component needed

const Message: FunctionComponent<MessageProps> = memo(({ 
	content, 
	isUser, 
	files = [], 
	matterCanvas,
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
			{/* Agent handles welcome messages - no special logic needed */}
			<div class="message-content">
				{/* Show content if available */}
				{content && (
					<div dangerouslySetInnerHTML={{ __html: marked(content) }} />
				)}
				
				{/* Show typing cursor for streaming content */}
				{isLoading && content && (
					<span class="typing-cursor">|</span>
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
						qualityScore={matterCanvas.qualityScore}
						answers={matterCanvas.answers}
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
				
				
				
			</div>
		</div>
	);
});

export default Message; 