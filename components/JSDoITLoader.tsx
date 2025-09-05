import React from 'react';

/**
 * Animated loader replicating static export (typing JSDoIT with colored segments and blinking cursor).
 */
const JSDoITLoader: React.FC<{ sizeRem?: number; cycleMs?: number }> = ({ sizeRem = 6, cycleMs = 3000 }) => {
	const totalChars = 6; // JSDoIT
	const typingSteps = totalChars; // steps in animation
	const typingDuration = cycleMs; // full cycle
	const styleTag = `@keyframes jsdoit-typing { 0%,90%,100% { width: 0ch; } 10%,80% { width: ${totalChars}ch; } }
@keyframes jsdoit-blink { 50% { border-color: transparent; } }`;
	return (
		<div className="flex justify-center items-center w-full h-full">
			<style>{styleTag}</style>
			<div
				className="font-mono font-bold whitespace-nowrap overflow-hidden border-r border-white"
				style={{
					fontSize: `${sizeRem}rem`,
					width: `${totalChars}ch`,
					animation: `jsdoit-typing ${typingDuration}ms steps(${typingSteps}) infinite, jsdoit-blink 750ms step-end infinite`
				}}
				aria-label="Loading JSDoIT"
			>
				<span style={{ color: '#ffffff' }}>JS</span>
				<span style={{ color: '#f5c000' }}>Do</span>
				<span style={{ color: '#00bfff' }}>IT</span>
			</div>
		</div>
	);
};

export default JSDoITLoader;
