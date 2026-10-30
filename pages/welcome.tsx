import { openIntercom } from "@/components/IntercomLoader";
import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { IconAlertCircle, IconArrowLeft, IconCheck, IconChevronRight, IconExternalLink, IconLoader2 } from "@tabler/icons-react";
import { RosterrMark } from "@/components/brand/RosterrMark";
import StepPattern from "@/components/brand/StepPattern";
import { focusRing, primaryButton, secondaryButton } from "@/components/marketing/Chrome";
import { useWorkspaceSetup } from "@/hooks/useWorkspaceSetup";
import { COLOURS } from "@/utils/workspaces/setup";

// Creates a workspace: pick the Roblox group, connect it with an Open Cloud API key, and (for the very first workspace on a fresh
// install) choose a colour. The steps are in hooks/useWorkspaceSetup.

const label = "block text-base font-semibold text-zinc-900 dark:text-zinc-50";
const hint = "mt-1 text-sm text-zinc-600 dark:text-zinc-400";
const field = `mt-2 block min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-base text-zinc-900 placeholder:text-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-400 ${focusRing}`;

const Welcome: NextPage = () => {
	const setup = useWorkspaceSetup();
	const { ready, creating: isLoading, adding: useCreateWs, groupInput, setGroupInput, groupId, groupError, colour: selectedColor, setColour: setSelectedColor, apiKey: robloxApiKey, changeKey, keyCheck: apiKeyStatus, keyMessage: apiKeyMessage, testKey: testApiKey, create: createAccount, canSubmit } = setup;

	const heading = useCreateWs ? "Create another workspace" : "Create your workspace";
	const stepMarker = "absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-ink text-sm font-bold text-white dark:bg-white dark:text-ink";
	const link = `inline-flex items-center gap-1.5 rounded px-1 py-2 text-base font-medium text-zinc-700 hover:text-zinc-900 hover:underline dark:text-zinc-300 dark:hover:text-white ${focusRing}`;
	const needs = ["Your group's ID, or its link", "Rank 25 or higher in that group", "A Roblox Open Cloud API key (we show you how)"];

	return (
		<div className="min-h-screen bg-white dark:bg-zinc-950 lg:grid lg:grid-cols-[5fr_7fr]">
			<Head>
				<title>{heading} · Rosterr</title>
			</Head>

			{/* The brand side: a compact header on phones, a full panel on large screens */}
			<aside className="relative overflow-hidden bg-ink px-6 py-10 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:items-center lg:self-start lg:px-14 lg:py-16">
				<StepPattern />
				<div className="relative mx-auto max-w-md lg:mx-0">
					<div className="flex items-center gap-4 lg:block">
						<div className="w-fit flex-shrink-0 rounded-[18px] shadow-[0_12px_32px_rgba(0,0,0,0.4)] lg:rounded-[22px]">
							<RosterrMark size={56} />
						</div>
						<h1 className="text-h2 sm:text-h1 lg:mt-8 lg:text-h1">{heading}</h1>
					</div>
					<p className="mt-3 text-lg text-magenta-200 lg:mt-4">Connect your Roblox group to Rosterr. It takes about three minutes.</p>
					<div className="mt-8 hidden lg:block">
						<h2 className="text-sm font-semibold uppercase tracking-wide text-magenta-200">What you'll need</h2>
						<ul className="mt-4 space-y-3 text-lg">
							{needs.map((n) => (
								<li key={n} className="flex items-start gap-3">
									<IconCheck size={22} className="mt-0.5 flex-shrink-0 text-emerald-300" aria-hidden="true" />
									{n}
								</li>
							))}
						</ul>
					</div>
				</div>
			</aside>

			<main className="px-6 py-10 sm:px-10 lg:min-h-screen lg:px-16 lg:py-20">
				{!ready ? (
					<div className="flex w-full items-center justify-center py-20" role="status" aria-live="polite">
						<IconLoader2 className="h-10 w-10 animate-spin text-zinc-500" aria-hidden="true" />
						<span className="sr-only">Loading</span>
					</div>
				) : (
					<form
						noValidate
						aria-busy={isLoading}
						onSubmit={(e) => {
							e.preventDefault();
							void createAccount();
						}}
						className="mx-auto w-full max-w-lg text-zinc-900 dark:text-zinc-50"
					>
						<ol className="space-y-10">
							{/* Step 1 */}
							<li className="relative pl-12">
								<span className="absolute bottom-[-2.5rem] left-4 top-10 w-px bg-zinc-300 dark:bg-zinc-700" aria-hidden="true" />
								<span className={stepMarker} aria-hidden="true">1</span>
								<section aria-labelledby="step-group">
									<h2 id="step-group" className="text-h3 leading-8">Your Roblox group</h2>
									<label htmlFor="groupid" className={`${label} mt-4`}>Group ID or group link</label>
									<input
										id="groupid"
										type="text"
										inputMode="text"
										autoComplete="off"
										autoCapitalize="off"
										spellCheck={false}
										value={groupInput}
										onChange={(e) => setGroupInput(e.target.value)}
										placeholder="752856518"
										aria-invalid={groupError ? true : undefined}
										aria-describedby={groupError ? "groupid-error groupid-hint" : "groupid-hint"}
										className={field}
									/>
									<p id="groupid-hint" className={hint}>
										{groupId ? (
											<span className="inline-flex items-center gap-1 font-medium text-emerald-800 dark:text-emerald-300">
												<IconCheck size={16} aria-hidden="true" /> Group ID {groupId}
											</span>
										) : (
											"Paste your group's link, or type its ID. It's in the group's web address, for example roblox.com/communities/12345."
										)}
									</p>
									{groupError && (
										<p id="groupid-error" role="alert" className="mt-2 flex items-start gap-1.5 text-sm font-medium text-red-700 dark:text-red-300">
											<IconAlertCircle size={18} className="mt-0.5 flex-shrink-0" aria-hidden="true" /> {groupError}
										</p>
									)}
								</section>
							</li>

							{/* Step 2 */}
							<li className="relative pl-12">
								{!useCreateWs && <span className="absolute bottom-[-2.5rem] left-4 top-10 w-px bg-zinc-300 dark:bg-zinc-700" aria-hidden="true" />}
								<span className={stepMarker} aria-hidden="true">2</span>
								<section aria-labelledby="step-key">
									<h2 id="step-key" className="text-h3 leading-8">Connect it with an API key</h2>
									<p className={`${hint} mt-1`}>Rosterr uses a Roblox Open Cloud API key to read your group's members and ranks.</p>

									<details className="group mt-3">
										<summary className={`inline-flex min-h-8 cursor-pointer list-none items-center gap-1 rounded text-base font-semibold text-magenta-deep dark:text-magenta-200 ${focusRing}`}>
											<IconChevronRight size={18} className="transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden="true" />
											How do I get a key?
										</summary>
										<ol className="mt-2 list-decimal space-y-2 border-l-2 border-zinc-300 pl-7 text-base text-zinc-800 dark:border-zinc-700 dark:text-zinc-200">
											<li>
												Open the{" "}
												<a href="https://create.roblox.com/dashboard/credentials" target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 rounded font-semibold text-magenta-deep underline dark:text-magenta-200 ${focusRing}`}>
													Roblox Creator Hub credentials page <IconExternalLink size={16} aria-hidden="true" />
													<span className="sr-only">(opens in a new tab)</span>
												</a>{" "}
												and choose <strong>Create API key</strong>.
											</li>
											<li>Make it a <strong>user</strong> key, not a group key.</li>
											<li>Add the <strong>Groups</strong> permission with <strong>group:read</strong>, and choose your group.</li>
											<li>Copy the key and paste it below.</li>
										</ol>
									</details>

									<label htmlFor="apikey" className={`${label} mt-5`}>Open Cloud API key</label>
									<div className="mt-2 flex flex-col gap-2 sm:flex-row">
										<input
											id="apikey"
											type="password"
											autoComplete="off"
											value={robloxApiKey}
											onChange={(e) => changeKey(e.target.value)}
											placeholder="Paste your key here"
											aria-describedby="apikey-result"
											className={`${field} mt-0 flex-1`}
										/>
										<button type="button" onClick={testApiKey} disabled={!robloxApiKey || !groupId || apiKeyStatus === "testing"} className={`${secondaryButton} !min-h-12 !rounded-xl disabled:cursor-not-allowed disabled:opacity-60`}>
											{apiKeyStatus === "testing" ? (
												<>
													<IconLoader2 size={18} className="animate-spin" aria-hidden="true" /> Testing
												</>
											) : (
												"Test key"
											)}
										</button>
									</div>
									<div id="apikey-result" role="status" aria-live="polite" className="mt-2 min-h-6 text-base">
										{apiKeyStatus === "valid" && (
											<p className="flex items-start gap-1.5 font-medium text-emerald-800 dark:text-emerald-300">
												<IconCheck size={20} className="mt-0.5 flex-shrink-0" aria-hidden="true" /> {apiKeyMessage || "That key works."}
											</p>
										)}
										{apiKeyStatus === "invalid" && (
											<p className="flex items-start gap-1.5 font-medium text-red-700 dark:text-red-300">
												<IconAlertCircle size={20} className="mt-0.5 flex-shrink-0" aria-hidden="true" /> {apiKeyMessage}
											</p>
										)}
									</div>
								</section>
							</li>

							{/* Step 3: only the very first workspace on an install picks a colour */}
							{!useCreateWs && (
								<li className="relative pl-12">
									<span className={stepMarker} aria-hidden="true">3</span>
									<section aria-labelledby="step-colour">
										<h2 id="step-colour" className="text-h3 leading-8">Pick a colour</h2>
										<p className={`${hint} mt-1`}>Used for buttons and highlights across your workspace. You can change it later.</p>
										<div role="radiogroup" aria-labelledby="step-colour" className="mt-4 flex flex-wrap gap-2.5">
											{COLOURS.map((c) => {
												const selected = selectedColor === c.value;
												return (
													<button
														key={c.value}
														type="button"
														role="radio"
														aria-checked={selected}
														aria-label={c.name}
														title={c.name}
														onClick={() => setSelectedColor(c.value)}
														className={`flex h-10 w-10 items-center justify-center rounded-full text-white ${c.value} ${selected ? "ring-2 ring-zinc-900 ring-offset-2 dark:ring-white dark:ring-offset-zinc-950" : ""} ${focusRing}`}
													>
														{selected && <IconCheck size={18} aria-hidden="true" />}
													</button>
												);
											})}
										</div>
									</section>
								</li>
							)}
						</ol>

						<div className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800">
							<button type="submit" disabled={!canSubmit} className={`${primaryButton} !min-h-12 w-full !rounded-xl disabled:cursor-not-allowed disabled:opacity-50`}>
								{isLoading ? (
									<>
										<IconLoader2 size={18} className="animate-spin" aria-hidden="true" /> Creating
									</>
								) : (
									"Create workspace"
								)}
							</button>
							{!canSubmit && !isLoading && <p className="mt-3 text-center text-sm text-zinc-600 dark:text-zinc-400">{!groupId ? "Enter your group to continue." : "Test your API key to continue."}</p>}
							<div className="mt-4 flex flex-wrap items-center justify-center gap-x-5">
								{useCreateWs && (
									<Link href="/" className={link}>
										<IconArrowLeft size={18} aria-hidden="true" /> My workspaces
									</Link>
								)}
								{/* The documentation lives in the help chat (Intercom), so this opens it. */}
								{process.env.NEXT_PUBLIC_INTERCOM_APP_ID && (
									<button type="button" onClick={() => void openIntercom()} className={link}>
										Help and documentation
									</button>
								)}
							</div>
						</div>
					</form>
				)}
			</main>
		</div>
	);
};

export default Welcome;
