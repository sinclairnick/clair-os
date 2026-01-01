import { Button } from '@/components/ui/button';
import { signIn } from '@/lib/auth-client';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { PageTitle } from '@/components/page-title';

export function LoginPage() {
	const [isLoading, setIsLoading] = useState(false);

	const handleGoogleSignIn = async () => {
		setIsLoading(true);
		try {
			await signIn.social({
				provider: 'google',
				callbackURL: window.location.origin + '/',
			});
		} catch (error) {
			console.error('Sign in error:', error);
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen w-full flex bg-background">
			<PageTitle title="Login" />

			{/* Left Column - The Magical Hearth (Darker Tone) */}
			<div className="hidden lg:flex w-1/2 bg-[#050a05] relative items-center justify-center overflow-hidden border-r border-border/10">
				{/* Ambient Undulating Forest Background */}
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#1a2e1a_0%,#020502_100%)]" />
				<div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_70%_30%,#2d4a2d_0%,transparent_60%)] animate-pulse" />
				<div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_20%_80%,#1e361e_0%,transparent_70%)] animate-pulse [animation-delay:2s]" />

				{/* The Crest - Prominent and Glorious */}
				<div className="relative z-10 flex flex-col items-center gap-8 animate-in fade-in zoom-in-95 duration-1000">
					<div className="relative group">
						{/* Multi-layered Glowing Halo */}
						<div className="absolute inset-0 bg-[#d4a574]/20 blur-[100px] rounded-full animate-pulse scale-150" />
						<div className="absolute inset-0 bg-[#d4a574]/10 blur-[60px] rounded-full" />
						<div className="absolute -inset-20 bg-primary/5 blur-[120px] rounded-full animate-pulse [animation-duration:4s]" />

						{/* The Icon */}
						<img
							src="/icon-raw.png"
							alt="ClairOS Crest"
							className="w-80 h-80 object-contain relative z-10 drop-shadow-[0_0_50px_rgba(212,165,116,0.2)] transform transition-all duration-700 group-hover:scale-110 group-hover:drop-shadow-[0_0_50px_rgba(212,165,116,0.4)]"
						/>
					</div>

					{/* Slogan - Subtly integrated */}
					<h1 className="text-base tracking-widest uppercase font-serif  text-[#f5e6d3]/30 leading-relaxed tracking-[0.1em] max-w-[220px] text-center animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300 group-hover:text-[#f5e6d3]/60">
						Home is where the hearth is
					</h1>
				</div>
			</div>

			{/* Right Column - Login & Primary Copy (Lighter Tone) - Responsive width */}
			<div className="w-full lg:w-1/2 bg-background flex items-center justify-center p-8 lg:p-12 relative">
				{/* Subtle background interest for the lighter side */}
				<div className="absolute inset-0 bg-[radial-gradient(at_top_right,var(--primary-foreground),transparent)] opacity-40 pointer-events-none" />

				<div className="w-full max-w-sm space-y-12 relative z-10">
					<div className="text-center space-y-6">
						<div className="space-y-4">
							<h2 className="text-5xl font-bold tracking-tight text-foreground">ClairOS</h2>
							<div className="h-1.5 w-16 bg-primary/20 mx-auto rounded-full" />
						</div>
						<p className="text-muted-foreground uppercase tracking-[0.3em] text-xs font-bold opacity-80">
							Home Operations System
						</p>
					</div>

					<div className="space-y-6">
						<Button
							onClick={handleGoogleSignIn}
							disabled={isLoading}
							size="lg"
							className="w-full h-14 text-lg font-medium shadow-lg hover:shadow-primary/10 transition-all duration-300"
						>
							{isLoading ? (
								<Loader2 className="w-6 h-6 animate-spin" />
							) : (
								<div className="flex items-center justify-center gap-3">
									<svg className="h-5 w-5" aria-hidden="true" viewBox="0 0 488 512">
										<path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
									</svg>
									<span>Continue with Google</span>
								</div>
							)}
						</Button>

						<div className="flex flex-col items-center gap-4">
							<div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
							<p className="px-6 text-center text-[10px] text-muted-foreground/60 leading-relaxed uppercase tracking-wider">
								Secure access to your home hearth <br />
								by continuing, you agree to our terms
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
