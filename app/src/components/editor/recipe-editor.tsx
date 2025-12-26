'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import Mention from '@tiptap/extension-mention';
import * as chrono from 'chrono-node';
import { forwardRef, useImperativeHandle, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
	Bold,
	Italic,
	Heading2,
	Heading3,
	List,
	ListOrdered,
	ListChecks,
	Undo,
	Redo,
} from 'lucide-react';

// Types for mentions
export interface IngredientMention {
	id: string;
	name: string;
	quantity?: number;
	unit?: string;
}

export interface TimerMention {
	id: string;
	duration: string;
	durationMs: number;
}

export interface RecipeEditorRef {
	getHTML: () => string;
	getJSON: () => object;
	getIngredients: () => IngredientMention[];
	getTimers: () => TimerMention[];
}

interface RecipeEditorProps {
	content?: string;
	onChange?: (html: string) => void;
	onIngredientsChange?: (ingredients: IngredientMention[]) => void;
	existingIngredients?: IngredientMention[];
	placeholder?: string;
	editable?: boolean;
	className?: string;
}

// Parse duration using chrono-node for natural language
function parseDurationWithChrono(text: string): number {
	const parsed = chrono.parse(`in ${text}`);
	if (parsed.length > 0 && parsed[0].start) {
		const date = parsed[0].start.date();
		const now = new Date();
		return Math.max(0, date.getTime() - now.getTime());
	}

	let ms = 0;
	const hours = text.match(/(\d+)\s*h/i);
	const minutes = text.match(/(\d+)\s*m/i);
	const seconds = text.match(/(\d+)\s*s/i);

	if (hours) ms += parseInt(hours[1]) * 60 * 60 * 1000;
	if (minutes) ms += parseInt(minutes[1]) * 60 * 1000;
	if (seconds) ms += parseInt(seconds[1]) * 1000;

	if (ms === 0 && /^\d+$/.test(text.trim())) {
		ms = parseInt(text.trim()) * 60 * 1000;
	}

	return ms || 60000;
}

function formatDuration(ms: number): string {
	const hours = Math.floor(ms / (60 * 60 * 1000));
	const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
	const seconds = Math.floor((ms % (60 * 1000)) / 1000);

	if (hours && minutes) return `${hours}h ${minutes}m`;
	if (hours) return `${hours}h`;
	if (minutes) return `${minutes}m`;
	if (seconds) return `${seconds}s`;
	return '1m';
}

// Ingredient suggestion configuration
function createIngredientSuggestion(existingIngredients: IngredientMention[] = []) {
	return {
		char: '@',
		allowSpaces: true,
		items: async ({ query }: { query: string }) => {
			const lowerQuery = query.toLowerCase();

			// Filter existing ingredients
			const matches = existingIngredients.filter(item =>
				item.name.toLowerCase().includes(lowerQuery)
			).map(item => ({
				id: item.id,
				name: item.name,
				type: 'existing' as const,
				quantity: item.quantity,
				unit: item.unit
			}));

			const results: Array<{ id: string | null; name: string; type: 'existing' | 'new'; quantity?: number; unit?: string }> = [...matches];

			// Add "Create new" option if query is not empty and doesn't exactly match an existing ingredient
			if (query.trim() && !matches.some(m => m.name.toLowerCase() === lowerQuery)) {
				results.unshift({
					id: null, // Will be generated
					name: query.trim(),
					type: 'new' as const,
				});
			}

			return results.slice(0, 10);
		},
		command: ({ editor, range, props }: { editor: any; range: any; props: { id: string | null; label?: string | null; type?: 'new' | 'existing'; name?: string } }) => {
			const id = props.id || (props.type === 'new' ? `new-${Date.now()}` : '');
			const label = props.name || props.label || id;

			editor
				.chain()
				.focus()
				.insertContentAt(range, [
					{
						type: 'ingredientMention',
						attrs: { id, label, isNew: props.type === 'new' },
					},
					{
						type: 'text',
						text: ' ',
					},
				])
				.run();

			window.getSelection()?.collapseToEnd();
		},
		render: () => {
			let popup: HTMLDivElement | null = null;
			let currentSelectedIndex = 0;
			let currentItems: Array<{ id: string | null; name: string; type: 'existing' | 'new'; quantity?: number; unit?: string }> = [];
			let currentCommand: ((props: any) => void) | null = null;

			const updatePopupContent = () => {
				if (!popup || currentItems.length === 0) return;

				// Clear existing content
				popup.innerHTML = '';

				currentItems.forEach((item, index) => {
					const btn = document.createElement('button');
					btn.className = `w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${index === currentSelectedIndex ? 'bg-accent' : 'hover:bg-accent/50'}`;
					btn.type = 'button';

					let icon = '🥕';
					let text = item.name;
					let subtext = '';

					if (item.type === 'new') {
						icon = '✨';
						text = `Create "${item.name}"`;
					} else if (item.quantity) {
						subtext = ` (${item.quantity}${item.unit ? ' ' + item.unit : ''})`;
					}

					btn.innerHTML = `<span>${icon}</span><span class="flex-1">${text}<span class="text-muted-foreground text-xs">${subtext}</span></span>`;
					btn.addEventListener('mousedown', (e) => {
						e.preventDefault();
						e.stopPropagation();
						if (currentCommand) currentCommand(item);
					});
					popup!.appendChild(btn);
				});
			};

			return {
				onStart: (props: { items: any[]; command: (props: any) => void; clientRect?: (() => DOMRect | null) | null }) => {
					currentItems = props.items;
					currentCommand = props.command;
					currentSelectedIndex = 0;

					popup = document.createElement('div');
					popup.className = 'fixed z-[9999] bg-popover text-popover-foreground border border-border rounded-md shadow-lg overflow-hidden min-w-[200px]';

					const rect = props.clientRect?.();
					if (rect) {
						popup.style.left = `${rect.left}px`;
						popup.style.top = `${rect.bottom + 4}px`;
					}

					updatePopupContent();
					document.body.appendChild(popup);
				},
				onUpdate: (props: { items: any[]; clientRect?: (() => DOMRect | null) | null }) => {
					currentItems = props.items;
					currentSelectedIndex = 0;

					if (currentItems.length === 0 && popup) {
						popup.remove();
						popup = null;
						return;
					}

					if (!popup) {
						popup = document.createElement('div');
						popup.className = 'fixed z-[9999] bg-popover text-popover-foreground border border-border rounded-md shadow-lg overflow-hidden min-w-[200px]';
						document.body.appendChild(popup);
					}

					const rect = props.clientRect?.();
					if (rect) {
						popup.style.left = `${rect.left}px`;
						popup.style.top = `${rect.bottom + 4}px`;
					}
					updatePopupContent();
				},
				onKeyDown: (props: { event: KeyboardEvent }) => {
					if (!popup || currentItems.length === 0) return false;

					if (props.event.key === 'ArrowDown') {
						props.event.preventDefault();
						currentSelectedIndex = (currentSelectedIndex + 1) % currentItems.length;
						updatePopupContent();
						return true;
					}
					if (props.event.key === 'ArrowUp') {
						props.event.preventDefault();
						currentSelectedIndex = (currentSelectedIndex - 1 + currentItems.length) % currentItems.length;
						updatePopupContent();
						return true;
					}
					if (props.event.key === 'Enter' || props.event.key === 'Tab') {
						props.event.preventDefault();
						if (currentCommand && currentItems[currentSelectedIndex]) {
							currentCommand(currentItems[currentSelectedIndex]);
						}
						return true;
					}
					if (props.event.key === 'Escape') {
						popup?.remove();
						popup = null;
						return true;
					}
					return false;
				},
				onExit: () => {
					popup?.remove();
					popup = null;
				},
			};
		},
	};
}

// Timer suggestion configuration with chrono-node
const timerSuggestion = {
	char: '#',
	allowSpaces: true,
	items: ({ query }: { query: string }) => {
		const suggestions = ['5 minutes', '10 minutes', '15 minutes', '30 minutes', '1 hour', '2 hours'];

		if (!query) return suggestions.slice(0, 6);

		const filtered = suggestions.filter(item =>
			item.toLowerCase().includes(query.toLowerCase())
		);

		if (query.trim()) {
			const ms = parseDurationWithChrono(query);
			if (ms > 0) {
				const formatted = formatDuration(ms);
				if (!filtered.some(f => formatDuration(parseDurationWithChrono(f)) === formatted)) {
					return [query.trim(), ...filtered.slice(0, 5)];
				}
			}
		}

		return filtered.length > 0 ? filtered.slice(0, 6) : (query.trim() ? [query.trim()] : suggestions.slice(0, 6));
	},
	command: ({ editor, range, props }: { editor: any; range: any; props: { id: string | null } }) => {
		const id = props.id || '';

		editor
			.chain()
			.focus()
			.insertContentAt(range, [
				{
					type: 'timerMention',
					attrs: { id },
				},
				{
					type: 'text',
					text: ' ',
				},
			])
			.run();
	},
	render: () => {
		let popup: HTMLDivElement | null = null;
		let currentSelectedIndex = 0;
		let currentItems: string[] = [];
		let currentCommand: ((props: { id: string }) => void) | null = null;

		const updatePopupContent = () => {
			if (!popup || currentItems.length === 0) return;

			popup.innerHTML = '';

			currentItems.forEach((item, index) => {
				const ms = parseDurationWithChrono(item);
				const formatted = formatDuration(ms);

				const btn = document.createElement('button');
				btn.className = `w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${index === currentSelectedIndex ? 'bg-accent' : 'hover:bg-accent/50'}`;
				btn.type = 'button';
				btn.innerHTML = `<span>⏱️</span><span>${formatted}</span>`;
				btn.addEventListener('mousedown', (e) => {
					e.preventDefault();
					e.stopPropagation();
					if (currentCommand) currentCommand({ id: item });
				});
				popup.appendChild(btn);
			});
		};

		return {
			onStart: (props: { items: string[]; command: (props: { id: string }) => void; clientRect?: (() => DOMRect | null) | null }) => {
				currentItems = props.items;
				currentCommand = props.command;
				currentSelectedIndex = 0;

				popup = document.createElement('div');
				popup.className = 'fixed z-[9999] bg-popover text-popover-foreground border border-border rounded-md shadow-lg overflow-hidden min-w-[140px]';

				const rect = props.clientRect?.();
				if (rect) {
					popup.style.left = `${rect.left}px`;
					popup.style.top = `${rect.bottom + 4}px`;
				}

				updatePopupContent();
				document.body.appendChild(popup);
			},
			onUpdate: (props: { items: string[]; clientRect?: (() => DOMRect | null) | null }) => {
				currentItems = props.items;
				currentSelectedIndex = 0;

				if (currentItems.length === 0 && popup) {
					popup.remove();
					popup = null;
					return;
				}

				if (!popup) {
					popup = document.createElement('div');
					popup.className = 'fixed z-[9999] bg-popover text-popover-foreground border border-border rounded-md shadow-lg overflow-hidden min-w-[140px]';
					document.body.appendChild(popup);
				}

				const rect = props.clientRect?.();
				if (rect) {
					popup.style.left = `${rect.left}px`;
					popup.style.top = `${rect.bottom + 4}px`;
				}
				updatePopupContent();
			},
			onKeyDown: (props: { event: KeyboardEvent }) => {
				if (!popup || currentItems.length === 0) return false;

				if (props.event.key === 'ArrowDown') {
					props.event.preventDefault();
					currentSelectedIndex = (currentSelectedIndex + 1) % currentItems.length;
					updatePopupContent();
					return true;
				}
				if (props.event.key === 'ArrowUp') {
					props.event.preventDefault();
					currentSelectedIndex = (currentSelectedIndex - 1 + currentItems.length) % currentItems.length;
					updatePopupContent();
					return true;
				}
				if (props.event.key === 'Enter' || props.event.key === 'Tab') {
					props.event.preventDefault();
					if (currentCommand && currentItems[currentSelectedIndex]) {
						currentCommand({ id: currentItems[currentSelectedIndex] });
					}
					return true;
				}
				if (props.event.key === 'Escape') {
					popup?.remove();
					popup = null;
					return true;
				}
				return false;
			},
			onExit: () => {
				popup?.remove();
				popup = null;
			},
		};
	},
};

export const RecipeEditor = forwardRef<RecipeEditorRef, RecipeEditorProps>(
	({ content = '', onChange, onIngredientsChange, existingIngredients, placeholder, editable = true, className }, ref) => {
		const [extractedIngredients, setExtractedIngredients] = useState<IngredientMention[]>([]);

		const ingredientSuggestion = createIngredientSuggestion(existingIngredients);

		const editor = useEditor({
			extensions: [
				StarterKit.configure({
					heading: { levels: [2, 3] },
				}),
				TaskList,
				TaskItem.configure({ nested: true }),
				Placeholder.configure({
					placeholder: placeholder || 'Write your recipe instructions...\n\nUse @ to add ingredients, # to add timers',
				}),
				Mention.extend({
					name: 'ingredientMention',
					renderHTML({ node }) {
						return [
							'span',
							{
								class: 'ingredient-mention inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded bg-primary/10 text-primary font-medium text-sm',
								'data-ingredient': node.attrs.id,
								'data-label': node.attrs.label || node.attrs.id,
							},
							`@${node.attrs.label || node.attrs.id}`,
						];
					},
					addAttributes() {
						return {
							id: {
								default: null,
								parseHTML: (element: HTMLElement) => element.getAttribute('data-ingredient'),
								renderHTML: (attributes: Record<string, any>) => {
									if (!attributes.id) {
										return {}
									}

									return {
										'data-ingredient': attributes.id,
									}
								},
							},
							label: {
								default: null,
								parseHTML: (element: HTMLElement) => element.getAttribute('data-label'),
								renderHTML: (attributes: Record<string, any>) => {
									if (!attributes.label) {
										return {}
									}
									return {
										'data-label': attributes.label,
									}
								}
							}
						}
					},
				}).configure({
					HTMLAttributes: { class: 'ingredient-mention' },
					suggestion: ingredientSuggestion,

				}),
				Mention.extend({ name: 'timerMention' }).configure({
					HTMLAttributes: { class: 'timer-mention' },
					suggestion: timerSuggestion,

					renderHTML({ node }) {
						const text = node.attrs.id;
						const ms = parseDurationWithChrono(text);
						return [
							'button',
							{
								class: 'timer-mention inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-full bg-accent text-accent-foreground font-medium text-sm cursor-pointer hover:bg-accent/80',
								'data-timer': text,
								'data-timer-ms': ms.toString(),
								type: 'button',
							},
							`⏱️ ${formatDuration(ms)}`,
						];
					},
				}),
			],
			content,
			editable,
			onUpdate: ({ editor }) => {
				const html = editor.getHTML();
				onChange?.(html);

				const ingredients = extractIngredientsFromEditor(editor);
				setExtractedIngredients(ingredients);
				onIngredientsChange?.(ingredients);
			},
		});

		const extractIngredientsFromEditor = useCallback((ed: ReturnType<typeof useEditor>) => {
			if (!ed) return [];

			const ingredients: IngredientMention[] = [];
			const json = ed.getJSON();

			function traverse(node: Record<string, unknown>) {
				if (node.type === 'ingredientMention') {
					const attrs = node.attrs as Record<string, string>;
					const id = attrs?.id;
					const label = attrs?.label;

					if (id) {
						// Attempt to parse quantity from label if it was entered that way (legacy support)
						// But primarily we just want the label as name

						// If legacy text based without label attribute, fallback to old parsing?
						// But we added label attribute support. 
						// If label is present, use it.

						if (label) {
							ingredients.push({
								id: id,
								name: label,
								// We don't extract quantity from editor text anymore as it's handled in the form
								// unless we want to parse it from the label? No, label is just name.
							});
						} else {
							// Fallback if no label (shouldn't happen with new mentions)
							// Treat id as name if it looks like a name, but it's likely a UUID now.
							// So we might default to "Ingredient" or try to find it?
							// For now, if no label, we might have an issue. 
							// But the 'text' in Tiptap mentions is usually not stored in attrs unless we put it there.
							// OLD logic read 'id' as text.
							ingredients.push({
								id: id,
								name: id, // Fallback, but likely UUID
							});
						}
					}
				}

				if (Array.isArray(node.content)) {
					node.content.forEach(traverse);
				}
			}

			traverse(json as Record<string, unknown>);
			return ingredients;
		}, []);

		useImperativeHandle(ref, () => ({
			getHTML: () => editor?.getHTML() || '',
			getJSON: () => editor?.getJSON() || {},
			getIngredients: () => extractedIngredients,
			getTimers: () => {
				if (!editor) return [];
				const timers: TimerMention[] = [];
				const json = editor.getJSON();

				function traverse(node: Record<string, unknown>) {
					if (node.type === 'timerMention' && (node.attrs as Record<string, string>)?.id) {
						const text = (node.attrs as Record<string, string>).id;
						timers.push({
							id: `${Date.now()}-${timers.length}`,
							duration: text,
							durationMs: parseDurationWithChrono(text),
						});
					}
					if (Array.isArray(node.content)) {
						node.content.forEach(traverse);
					}
				}

				traverse(json as Record<string, unknown>);
				return timers;
			},
		}));

		if (!editor) return null;

		return (
			<div className={cn('recipe-editor', className)}>
				{editable && (
					<div className="flex flex-wrap gap-1 p-2 border-b border-border bg-muted/30">
						<Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBold().run()} className={cn(editor.isActive('bold') && 'bg-accent')}>
							<Bold className="w-4 h-4" />
						</Button>
						<Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleItalic().run()} className={cn(editor.isActive('italic') && 'bg-accent')}>
							<Italic className="w-4 h-4" />
						</Button>
						<div className="w-px h-6 bg-border mx-1" />
						<Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={cn(editor.isActive('heading', { level: 2 }) && 'bg-accent')}>
							<Heading2 className="w-4 h-4" />
						</Button>
						<Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={cn(editor.isActive('heading', { level: 3 }) && 'bg-accent')}>
							<Heading3 className="w-4 h-4" />
						</Button>
						<div className="w-px h-6 bg-border mx-1" />
						<Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBulletList().run()} className={cn(editor.isActive('bulletList') && 'bg-accent')}>
							<List className="w-4 h-4" />
						</Button>
						<Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={cn(editor.isActive('orderedList') && 'bg-accent')}>
							<ListOrdered className="w-4 h-4" />
						</Button>
						<Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleTaskList().run()} className={cn(editor.isActive('taskList') && 'bg-accent')}>
							<ListChecks className="w-4 h-4" />
						</Button>
						<div className="w-px h-6 bg-border mx-1" />
						<Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
							<Undo className="w-4 h-4" />
						</Button>
						<Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
							<Redo className="w-4 h-4" />
						</Button>
					</div>
				)}

				<EditorContent
					editor={editor}
					className={cn(
						'prose prose-sm max-w-none p-4',
						'prose-headings:font-semibold prose-headings:text-foreground',
						'prose-p:text-foreground prose-p:leading-relaxed',
						'[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[200px]',
						'[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
						'[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground',
						'[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left',
						'[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none',
						'[&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0',
						'[&_ul[data-type="taskList"]]:list-none [&_ul[data-type="taskList"]]:pl-0',
						'[&_ul[data-type="taskList"]_li]:flex [&_ul[data-type="taskList"]_li]:gap-2',
					)}
				/>
			</div>
		);
	}
);

RecipeEditor.displayName = 'RecipeEditor';
