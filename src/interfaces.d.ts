import { MemoryStore } from 'dojo-widgets/util/createMemoryStore';

/**
 *
 */
export interface WidgetStateRecord {
	[prop: string]: any;
	id: string;
	classes?: string[];
	label?: string;
	children?: string[];
	completed?: boolean;
	checked?: boolean;
	filter?: string;
}

export interface WithStore {
	widgetStore?: MemoryStore<WidgetStateRecord>;
}
