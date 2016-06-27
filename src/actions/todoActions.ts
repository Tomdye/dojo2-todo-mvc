import createAction, { AnyAction } from 'dojo-actions/createAction';
import request from 'dojo-core/request';
import { MemoryStore } from 'dojo-widgets/util/createMemoryStore';
import { CombinedRegistry } from 'dojo-app/createApp';

interface WidgetStateRecord {
	[prop: string]: any;
	id: string;
	classes?: string[];
	label?: string;
	children?: string[];
	completed?: boolean;
	checked?: boolean;
}

interface CompletePatchObject {
	id: string;
	completed: boolean;
	classes?: string[];
}

interface WithStore {
	widgetStore?: MemoryStore<WidgetStateRecord>;
}

function configure (registry: CombinedRegistry) {
	const action = <WithStore> this;
	return registry.getStore('widget-store').then((widgetStore) => {
		action.widgetStore = <MemoryStore<WidgetStateRecord>> widgetStore;
	});
};

function generateId (): string {
	return `${Date.now()}`;
}

function getTodoListItems(widgetStore: MemoryStore<WidgetStateRecord>) {
	return widgetStore.get('todo-list').then((parent: WidgetStateRecord) => {
		const promises = parent.children.map((child: string) => {
			return widgetStore.get(child);
		});
		return Promise.all(promises);
	});
}

function chain(array: any[], fn: any) {
	const first = array.shift();

	return array.reduce((defPrevious: any, current: any) => {
		return defPrevious.then(() => {
			return fn(current);
		});
	}, fn(first));
};

function setClass(todoItemState: WidgetStateRecord, className: string, action: string) {
	const idx = todoItemState.classes.indexOf(className);
	if (idx  === -1 && action !== 'remove') {
		todoItemState.classes.push(className);
	} else if (idx !== -1 && action !== 'add') {
		todoItemState.classes.splice(idx, 1);
	}
	return todoItemState.classes;
}

const createActionWithStore = createAction.extend<WithStore>({});

export const checkTodoItemCount: AnyAction = createActionWithStore({
	configure,
	do() {
		const { widgetStore } = <WithStore> this;

		return widgetStore.get('todo-list').then((todoList: WidgetStateRecord) => {
			const action = (todoList.children.length === 0) ? 'add' : 'remove';
			const widgetNames = ['todo-toggle-all', 'main-section', 'todo-footer'];
			const promises = widgetNames.map((name) => widgetStore.get(name).then((state: WidgetStateRecord) =>
				widgetStore.patch({'id': state.id, 'classes': setClass(state, 'hidden', action)})));

			return Promise.all(promises);
		});
	}
});

export const toggleStates: AnyAction = createActionWithStore({
	configure,
	do() {
		const { widgetStore } = <WithStore> this;

		getTodoListItems(widgetStore).then((todoItems: any[]) => {
			const itemsLeft = todoItems.some((item: WidgetStateRecord) => {
				return !item.completed;
			});
			const anyCompleted = todoItems.some((item: WidgetStateRecord) => {
				return item.completed;
			});
			return Promise.all([
				widgetStore.patch({'id': 'todo-toggle-all', 'checked': !itemsLeft}),
				widgetStore.get('clear-completed').then((state: WidgetStateRecord) => {
					const action = anyCompleted ? 'remove' : 'add';
					return widgetStore.patch({'id': 'clear-completed', 'classes': setClass(state, 'hidden', action)});
				})
			]);
		});
	}
});

export const counterUpdate: AnyAction = createActionWithStore({
	configure,
	do() {
		const { widgetStore } = <WithStore> this;

		return getTodoListItems(widgetStore).then((childrenWidgets: any[]) => {
			const itemsLeft = childrenWidgets.filter((childWidget: WidgetStateRecord) => {
				return !childWidget.completed;
			});
			const label = itemsLeft.length === 1 ? ' item left' : ' items left';
			return Promise.all([
				widgetStore.patch({'id': 'todo-count-number', 'label': itemsLeft.length.toString()}),
				widgetStore.patch({'id': 'todo-count-label', label}),
				checkTodoItemCount.do(),
				toggleStates.do()
			]);
		});
	}
});

export const createMany: AnyAction = createActionWithStore({
	configure,
	do(todos: any[]) {
		const { widgetStore } = <WithStore> this;

		const children = todos.map((todo: WidgetStateRecord) => {
			const label = todo.label;
			const id = todo.id || generateId();
			const completed = todo.completed || false;
			const classes = completed ? ['completed'] : [];
			return widgetStore.add({ id, label, completed, classes })
			.then(() => id);
		});

		return Promise.all(children).then((ids) => {
			return widgetStore.get('todo-list')
			.then((todosState: WidgetStateRecord) => [...todosState.children, ...ids])
			.then((children: string[]) => widgetStore.patch({ id: 'todo-list', children }))
			.then(() => counterUpdate.do());
		});
	}
});

export const create: AnyAction = createActionWithStore({
	configure,
	do(options: any) {
		const { widgetStore } = <WithStore> this;
		const id = generateId();
		const label = options.label;

		return widgetStore.add({ id, label, completed: false, classes: [] })
		.then(() => widgetStore.get('todo-list'))
		.then((todosState: WidgetStateRecord) => [...todosState.children, id])
		.then((children: string[]) => widgetStore.patch({ id: 'todo-list', children }))
		.then(() => counterUpdate.do())
		.then(() => {
			return request.post('todo/' + id, {
				headers: {
					'Content-Type': 'application/json'
				},
				data: {
					id,
					label,
					completed: false
				}
			});
		})
		.then(() => id);
	}
});

export const toggleComplete: AnyAction = createActionWithStore({
	configure,
	do(options: any) {
		const { widgetStore } = <WithStore> this;
		const itemId = options.id;
		const action = options.action || 'toggle';
		const patchObject: CompletePatchObject = {
			id: itemId,
			completed: options.complete
		};

		return widgetStore.get(itemId)
		.then((todoItemState: WidgetStateRecord) => setClass(todoItemState, 'completed', action))
		.then((classes: string[]) => {
			patchObject.classes = classes;
			return widgetStore.patch(patchObject);
		})
		.then(() => counterUpdate.do())
		.then(() => {
			return request.post('todo/' + itemId + '/update', {
				headers: {
					'Content-Type': 'application/json'
				},
				data: patchObject
			});
		});
	}
});

export const destroy: AnyAction = createActionWithStore({
	configure,
	do(options: any) {
		const { widgetStore } = <WithStore> this;
		const childIds = options.ids || [options.id];

		return widgetStore.get('todo-list')
		.then((todosState: WidgetStateRecord) => todosState.children.filter((id) => childIds.indexOf(id) === -1))
		.then((children: string[]) => widgetStore.patch({ id: 'todo-list', children }))
		.then(() => counterUpdate.do())
		.then(() => {
			return chain(childIds, function(id: string) {
				return request.delete('todo/' + id + '/delete', {
					headers: {
						'Content-Type': 'application/json'
					},
					data: {
						id
					}
				});
			});
		})
		.then(() => {
			const promises = childIds.map((id: string) => {
				widgetStore.delete(id);
			});
			return Promise.all(promises);
		});
	}
});

export const enterTodoEdit: AnyAction = createActionWithStore({
	configure,
	do(options: any) {
		const { widgetStore } = <WithStore> this;
		const itemId = options.id;
		const patchObject: WidgetStateRecord = {
			id: itemId
		};

		return widgetStore.get(itemId)
		.then((todoItemState: WidgetStateRecord) => setClass(todoItemState, 'editing', 'add'))
		.then((classes: string[]) => {
			patchObject.classes = classes;
			return widgetStore.patch(patchObject);
		});
	}
});

export const saveTodoEdit: AnyAction = createActionWithStore({
	configure,
	do(options: any) {
		const { widgetStore } = <WithStore> this;
		const target = <any> options.event.target;
		const itemId = options.id;
		const patchObject: WidgetStateRecord = {
			id: itemId,
			label: target.value
		};

		if (options.event.keyCode === 13 && target.value) {
			return widgetStore.get(itemId)
			.then((todoItemState: WidgetStateRecord) => setClass(todoItemState, 'editing', 'remove'))
			.then((classes: string[]) => {
				patchObject.classes = classes;
				return widgetStore.patch(patchObject);
			})
			.then(() => {
				return request.post('todo/' + itemId + '/update', {
					headers: {
						'Content-Type': 'application/json'
					},
					data: patchObject
				});
			});
		}
	}
});

export const exitTodoEdit: AnyAction = createActionWithStore({
	configure,
	do(options: any) {
		console.log('blur');
	}
});

export const filter: AnyAction = createActionWithStore({
	configure,
	do(options: {filter: string}) {
		const { widgetStore } = <WithStore> this;
		const allClasses: string[] = [];
		const activeClasses: string[] = [];
		const completedClasses: string[] = [];
		if (options.filter === 'completed') {
			completedClasses.push('selected');
		} else if (options.filter === 'active') {
			activeClasses.push('selected');
		} else {
			allClasses.push('selected');
		}

		return Promise.all([
			widgetStore.patch({'id': 'todo-list', 'filter': options.filter}),
			widgetStore.patch({'id': 'all-filter', 'classes': allClasses}),
			widgetStore.patch({'id': 'active-filter', 'classes': activeClasses}),
			widgetStore.patch({'id': 'completed-filter', 'classes': completedClasses})
		]);
	}
});

export const toggleAll: AnyAction = createActionWithStore({
	configure,
	do() {
		const { widgetStore } = <WithStore> this;
		return widgetStore.get('todo-toggle-all').then((toggleAllState: WidgetStateRecord) => {
			return getTodoListItems(widgetStore).then((todoItems: any[]) => {
				const checked = toggleAllState.checked;
				const action = checked ? 'remove' : 'add';
				return chain(todoItems, function(item: any) {
					return toggleComplete.do({'id': item.id, 'complete': !checked, action });
				});
			});
		});
	}
});

export const clearCompleted: AnyAction = createActionWithStore({
	configure,
	do() {
		const { widgetStore } = <WithStore> this;
		return getTodoListItems(widgetStore).then((childWidgets: any[]) => {
			const ids = childWidgets.reduce((previous: string[], current: WidgetStateRecord) => {
				if (current.completed) {
					previous.push(current.id);
				}
				return previous;
			}, []);
			if (ids.length > 0) {
				return destroy.do({ids}).then(() => {
					return widgetStore.get('clear-completed').then((widgetState: WidgetStateRecord) => {
						return widgetStore.patch({'id': 'clear-completed', 'classes': setClass(widgetState, 'hidden', 'add')});
					});
				});
			}
		});
	}
});

