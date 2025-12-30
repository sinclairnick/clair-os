import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
		<div className="min-h-screen flex items-center justify-center p-8 relative overflow-hidden bg-[#091209]">
			<PageTitle title="Login" />

			{/* Animated Atmosphere */}
			<div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
				{/* The Core Deep Forest Gradient */}
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_center,#1a2e1a_0%,#091209_100%)]" />


				{/* The "Hearth" Glow - Warm light leaking from below */}
				<div className="absolute -bottom-[20%] left-1/2 -translate-x-1/2 w-[150%] h-[100%] bg-[radial-gradient(ellipse_at_bottom,rgba(212,165,116,0.15)_0%,transparent_70%)] blur-3xl animate-pulse" />
			</div>

			<div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-1000">
				{/* The "Hearth Gate" Frame - Carved Wood/Stone Vibe */}
				<div className="absolute -inset-6 bg-[#2d1b18] rounded-t-[11.5rem] rounded-b-[4rem] shadow-[0_0_100px_rgba(0,0,0,0.8),inset_0_0_60px_rgba(0,0,0,0.8)] border-[3px] border-[#3e2723]">
					{/* Bezel Light Reflection */}
					<div className="absolute inset-0 rounded-t-[11.5rem] rounded-b-[4rem] border-t border-l border-white/5 pointer-events-none" />
					<div className="absolute inset-0 rounded-t-[11.5rem] rounded-b-[4rem] border-b border-r border-black/40 pointer-events-none" />
				</div>

				{/* Inner Glow/Mist */}
				<div className="absolute -inset-2 bg-[#d4a574]/5 rounded-t-[10.5rem] rounded-b-[3rem] blur-xl animate-pulse" />

				<Card className="relative border-none bg-gradient-to-b from-[#1c2e1c]/95 to-[#142214]/98 backdrop-blur-3xl shadow-[inset_0_0_80px_rgba(0,0,0,0.6)] rounded-t-[10.5rem] rounded-b-[3rem] overflow-hidden">
					{/* Textural Parchment Overlay */}
					<div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]" />

					<CardHeader className="text-center pt-24 pb-10 px-10">
						<div className="flex justify-center mb-10 relative">
							{/* Halo behind icon */}
							<div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-32 bg-[#d4a574]/10 blur-[60px] rounded-full animate-pulse" />
							<img
								src="/icon-raw.png"
								alt="ClairOS Logo"
								className="w-44 h-44 object-contain relative z-10 drop-shadow-[0_15px_30px_rgba(0,0,0,0.7)]"
							/>
						</div>

						<div className="space-y-4">
							<CardTitle className="text-5xl font-serif text-[#f5e6d3] tracking-[0.05em] drop-shadow-lg">
								ClairOS
							</CardTitle>
							<div className="relative h-px w-20 mx-auto">
								<div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#d4a574]/40 to-transparent" />
							</div>
							<CardDescription className="text-[#f5e6d3]/30 text-base uppercase tracking-[0.4em] font-bold">
								Home Operations
							</CardDescription>
						</div>
					</CardHeader>

					<CardContent className="space-y-12 pb-24 px-12">
						<div className="relative group/btn">
							{/* Button Ornamental Glow */}
							<div className="absolute -inset-4 bg-[#d4a574]/5 blur-2xl opacity-0 group-hover/btn:opacity-100 transition-opacity duration-700" />

							<Button
								onClick={handleGoogleSignIn}
								disabled={isLoading}
								className="relative z-10 w-full bg-[#f5e6d3] text-[#1c2e1c] hover:bg-[#e6d5c0] active:scale-[0.98] transition-all duration-300 h-16 text-xl font-serif italic border-none shadow-[0_15px_40px_-5px_rgba(0,0,0,0.7)] rounded-2xl overflow-hidden group/text"
							>
								{/* Button Texture */}
								<div className="absolute inset-0 opacity-[0.1] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/old-map.png')]" />

								{isLoading ? (
									<Loader2 className="w-6 h-6 animate-spin mx-auto text-[#1c2e1c]" />
								) : (
									<span className="flex items-center justify-center gap-5 relative z-10">
										<div className="w-6 h-6 rounded-full border border-[#1c2e1c]/10 flex items-center justify-center">
											<div className="w-1.5 h-1.5 rounded-full bg-[#1c2e1c]/60 animate-none group-hover/text:scale-150 transition-transform duration-500" />
										</div>
										Enter the Hearth
									</span>
								)}
							</Button>
						</div>

						<div className="flex flex-col items-center gap-2 opacity-10">
							<div className="flex gap-2">
								<div className="w-1 h-1 rounded-full bg-[#f5e6d3]" />
								<div className="w-1 h-1 rounded-full bg-[#f5e6d3]" />
								<div className="w-1 h-1 rounded-full bg-[#f5e6d3]" />
							</div>
							<p className="text-[#f5e6d3] text-[9px] uppercase tracking-[1em] font-black pl-[1em]">
								Secure
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
