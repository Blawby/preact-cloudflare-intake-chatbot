import { FunctionComponent } from 'preact';
import { useRef, useState } from 'preact/hooks';
import { Button } from './ui/Button';

interface FileUploadProps {
	onFileSelect: (files: File[]) => void;
	accept?: string;
	multiple?: boolean;
}

const FileUpload: FunctionComponent<FileUploadProps> = ({
	onFileSelect,
	accept = '*',
	multiple = false,
}) => {
	const [isDragging, setIsDragging] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleDragEnter = (e: DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(true);
	};

	const handleDragLeave = (e: DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
	};

	const handleDragOver = (e: DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
	};

	const handleDrop = (e: DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);

		const files = Array.from(e.dataTransfer?.files || []);
		if (files.length > 0) {
			onFileSelect(files);
		}
	};

	const handleFileInput = (e: Event) => {
		const target = e.target as HTMLInputElement;
		const files = Array.from(target.files || []);
		if (files.length > 0) {
			onFileSelect(files);
		}
		// Reset input value to allow selecting the same file again
		target.value = '';
	};

	const handleButtonClick = () => {
		fileInputRef.current?.click();
	};

	return (
		<div
			className={`flex items-center relative ${isDragging ? 'after:content-[""] after:absolute after:-top-2.5 after:-left-2.5 after:-right-2.5 after:-bottom-2.5 after:border-2 after:border-dashed after:border-amber-500 after:rounded-lg after:animate-pulse' : ''}`}
			onDragEnter={handleDragEnter}
			onDragLeave={handleDragLeave}
			onDragOver={handleDragOver}
			onDrop={handleDrop}
		>
			<input
				type="file"
				ref={fileInputRef}
				className="hidden"
				accept={accept}
				multiple={multiple}
				onChange={handleFileInput}
			/>
			<Button
				variant="icon"
				onClick={handleButtonClick}
				title="Upload file"
				className="text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors duration-200"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					className="w-4 h-4"
				>
					<path
						fill="currentColor"
						d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"
					/>
				</svg>
			</Button>
		</div>
	);
};

export default FileUpload; 