import { FaceSmileIcon } from '@heroicons/react/24/outline';

interface TeamProfileProps {
	name: string;
	profileImage: string | null;
	teamId: string;
	variant?: 'sidebar' | 'welcome';
	showVerified?: boolean;
}

export default function TeamProfile({ 
	name, 
	profileImage, 
	teamId, 
	variant = 'sidebar',
	showVerified = true 
}: TeamProfileProps) {
	const isWelcome = variant === 'welcome';
	
	return (
		<div className={`team-profile ${variant}`}>
			{/* Team Logo */}
			<div className="team-logo-container">
				{profileImage ? (
					<img 
						src={profileImage} 
						alt={`${name} logo`}
						className="team-logo"
					/>
				) : (
					<div className="team-logo-placeholder">
						<FaceSmileIcon className={isWelcome ? "w-12 h-12" : "w-8 h-8"} />
					</div>
				)}
			</div>

			{/* Team Name with Verified Badge */}
			<div className="team-name">
				<h3>{name}</h3>
				{showVerified && (
					<svg className="verified-check" fill="currentColor" viewBox="0 0 20 20" aria-label="Verified" title="Verified">
						<path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
					</svg>
				)}
			</div>

			{/* Team Slug */}
			<div className="team-slug">
				<span>@{teamId}</span>
			</div>
		</div>
	);
} 