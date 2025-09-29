import { FaceSmileIcon } from '@heroicons/react/24/outline';

interface TeamProfileProps {
	name: string;
	profileImage: string | null;
	teamId: string;
	description?: string | null;
	variant?: 'sidebar' | 'welcome';
	showVerified?: boolean;
}

export default function TeamProfile({ 
	name, 
	profileImage, 
	teamId, 
	description,
	variant = 'sidebar',
	showVerified = true 
}: TeamProfileProps) {
	const isWelcome = variant === 'welcome';
	
	return (
		<div className={`flex flex-col items-center gap-3 ${variant === 'welcome' ? 'p-6' : 'p-4'}`}>
			{/* Team Logo */}
			<div className="flex items-center justify-center">
				{profileImage ? (
					<img 
						src={profileImage} 
						alt={`${name} logo`}
						className={`rounded-lg object-cover ${isWelcome ? 'w-16 h-16' : 'w-12 h-12'}`}
					/>
				) : (
					<div className={`flex items-center justify-center rounded-lg bg-gray-100 dark:bg-dark-hover ${isWelcome ? 'w-16 h-16' : 'w-12 h-12'}`}>
						<FaceSmileIcon className={isWelcome ? "w-12 h-12" : "w-8 h-8"} />
					</div>
				)}
			</div>

			{/* Team Name with Verified Badge */}
			<div className="flex items-center justify-center gap-2">
				<h3 className="text-base sm:text-lg lg:text-xl font-semibold text-center m-0 text-gray-900 dark:text-white leading-tight">{name}</h3>
				{showVerified && variant === 'welcome' && (
					<svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-900 dark:text-white flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-label="Verified" title="Verified">
						<path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
					</svg>
				)}
			</div>

			{/* Team Slug */}
			<div className="text-center">
				<span className="text-sm sm:text-base lg:text-lg font-medium text-[#d4af37]">@{teamId}</span>
			</div>

			{/* Team Description - Only show for welcome variant */}
			{description && variant === 'welcome' && (
				<div className="text-center">
					<p className="text-gray-500 dark:text-gray-400 text-center text-sm sm:text-base lg:text-lg leading-relaxed max-w-xs mx-auto">{description}</p>
				</div>
			)}
		</div>
	);
} 