import createAction, { AnyAction } from 'dojo-actions/createAction';
import request from 'dojo-core/request';

interface TodoActionConfiguration {
	widgetStore: any;
	parentId: string;
}

interface WidgetStateRecord {
	[prop: string]: any;
	id: string;
	classes?: string[];
	label?: string;
	children?: string[];
}

function configure (configuration: TodoActionConfiguration) {
	this.configuration = configuration;
};

function generateId (): string {
	return `${Date.now()}`;
}

function getTodoListItems(widgetStore: any) {
	return widgetStore.get('todo-list').then((parent: any) => {
		const promises = parent.children.map((child: any) => {
			return widgetStore.get(child);
		});
		return Promise.all(promises);
	});
}

function chain(array: any, fn: any) {
	const first = array.shift();

	return array.reduce((defPrevious: any, current: any) => {
		return defPrevious.then(() => {
			return fn(current);
		});
	}, fn(first));
};

const checkTodoItemCount: AnyAction = createAction({
	configure,
	do() {
		const widgetStore = this.configuration.widgetStore;

		return widgetStore.get('todo-list').then((todoList: any) => {
			const action = (todoList.children.length === 0) ? 'add' : 'remove';
			const widgetNames = ['todo-toggle-all', 'main-section', 'todo-footer'];
			const promises = widgetNames.map((name) => widgetStore.get(name).then((state: any) =>
				widgetStore.patch({'id': state.id, 'classes': setClass(state, 'hidden', action)})));

			return Promise.all(promises);
		});
	}
});

const toggleStates: AnyAction = createAction({
	configure,
	do() {
		const widgetStore = this.configuration.widgetStore;
		getTodoListItems(widgetStore).then((todoItems: any[]) => {
			const itemsLeft = todoItems.some((item: any) => {
				return !item.completed;
			});
			const anyCompleted = todoItems.some((item: any) => {
				return item.completed;
			});
			return Promise.all([
				widgetStore.patch({'id': 'todo-toggle-all', 'checked': !itemsLeft}),
				widgetStore.get('clear-completed').then((state: any) => {
					const action = anyCompleted ? 'remove' : 'add';
					return widgetStore.patch({'id': 'clear-completed', 'classes': setClass(state, 'hidden', action)});
				})
			]);
		});
	}
});

const counterUpdate: AnyAction = createAction({
	configure,
	do() {
		const widgetStore = this.configuration.widgetStore;

		return getTodoListItems(widgetStore).then((childrenWidgets: any) => {
			const itemsLeft = childrenWidgets.filter((childWidget: any) => {
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

const createMany: AnyAction = createAction({
	configure,
	do(todos: any[]) {
		const widgetStore = this.configuration.widgetStore;
		const parentId = this.configuration.parentId;

		const children = todos.map((todo: any) => {
			const label = todo.label;
			const id = todo.id || generateId();
			const completed = todo.completed || false;
			const classes = completed ? ['completed'] : [];
			return widgetStore.add({ id, label, completed, classes })
			.then(() => id);
		});

		return Promise.all(children).then((ids) => {
			return widgetStore.get(parentId)
			.then((todosState: WidgetStateRecord) => [...todosState.children, ...ids])
			.then((children: string[]) => widgetStore.patch({ id: parentId, children }))
			.then(() => counterUpdate.do());
		});
	}
});

const create: AnyAction = createAction({
	configure,
	do(options: any) {
		const id = generateId();
		const widgetStore = this.configuration.widgetStore;
		const parentId = this.configuration.parentId;

		const label = options.label;

		return widgetStore.add({ id, label, completed: false, classes: [] })
		.then(() => widgetStore.get(parentId))
		.then((todosState: WidgetStateRecord) => [...todosState.children, id])
		.then((children: string[]) => widgetStore.patch({ id: parentId, children }))
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

interface CompletePatchObject {
	id: string;
	completed: boolean;
	classes?: string[];
}

const todoCompleteClass = 'completed';

function setClass(todoItemState: any, className: string, action: string) {
	const idx = todoItemState.classes.indexOf(className);
	if (idx  === -1 && action !== 'remove') {
		todoItemState.classes.push(className);
	} else if (idx !== -1 && action !== 'add') {
		todoItemState.classes.splice(idx, 1);
	}
	return todoItemState.classes;
}

const toggleComplete: AnyAction = createAction({
	configure,
	do(options: any) {
		const widgetStore = this.configuration.widgetStore;
		const itemId = options.id;
		const action = options.action || 'toggle';
		const patchObject: CompletePatchObject = {
			id: itemId,
			completed: options.complete
		};

		return widgetStore.get(itemId)
		.then((todoItemState: any) => setClass(todoItemState, todoCompleteClass, action))
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

const destroy: AnyAction = createAction({
	configure,
	do(options: any) {
		const widgetStore = this.configuration.widgetStore;
		const parentId = this.configuration.parentId;
		const childIds = options.ids || [options.id];

		return widgetStore.get(parentId)
		.then((todosState: WidgetStateRecord) => todosState.children.filter((id) => childIds.indexOf(id) === -1))
		.then((children: string[]) => widgetStore.patch({ id: parentId, children }))
		.then(() => counterUpdate.do())
		.then(() => {
			return chain(childIds, function(id: any) {
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

const enterTodoEdit: AnyAction = createAction({
	configure,
	do(options: any) {
		const widgetStore = this.configuration.widgetStore;
		const itemId = options.id;
		const patchObject: any = {
			id: itemId
		};

		return widgetStore.get(itemId)
		.then((todoItemState: any) => setClass(todoItemState, 'editing', 'add'))
		.then((classes: string[]) => {
			patchObject.classes = classes;
			return widgetStore.patch(patchObject);
		});
	}
});

const saveTodoEdit: AnyAction = createAction({
	configure,
	do(options: any) {
		const target = <any> options.event.target;
		const widgetStore = this.configuration.widgetStore;
		const itemId = options.id;
		const patchObject: any = {
			id: itemId,
			label: target.value
		};

		if (options.event.keyCode === 13 && target.value) {
			return widgetStore.get(itemId)
			.then((todoItemState: any) => setClass(todoItemState, 'editing', 'remove'))
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

const exitTodoEdit: AnyAction = createAction({
	configure,
	do(options: any) {
		console.log('blur');
	}
});

const filter: AnyAction = createAction({
	configure,
	do(options: any) {
		const widgetStore = this.configuration.widgetStore;
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

const toggleAll: AnyAction = createAction({
	configure,
	do(options: any) {
		this.configuration.getStore('widget-store').then((widgetStore: any) => {
			return widgetStore.get('todo-toggle-all').then((toggleAllState: any) => {
				return getTodoListItems(widgetStore).then((todoItems: any) => {
					const checked = toggleAllState.checked;
					const action = checked ? 'remove' : 'add';
					return chain(todoItems, function(item: any) {
						return toggleComplete.do({'id': item.id, 'complete': !checked, action });
					});
				});
			});
		});
	}
});

const clearCompleted: AnyAction = createAction({
	configure,
	do() {
		return this.configuration.getStore('widget-store').then((widgetStore: any) => {
			return getTodoListItems(widgetStore).then((childWidgets: any) => {
				const ids = childWidgets.reduce((previous: any, current: any) => {
					if (current.completed) {
						previous.push(current.id);
					}
					return previous;
				}, []);
				if (ids.length > 0) {
					return destroy.do({ids}).then(() => {
						return widgetStore.get('clear-completed').then((widgetState: any) => {
							return widgetStore.patch({'id': 'clear-completed', 'classes': setClass(widgetState, 'hidden', 'add')});
						});
					});
				}
			});
		});
	}
});

function registerAll (configuration: TodoActionConfiguration) {
	create.configure(configuration);
	destroy.configure(configuration);
	toggleComplete.configure(configuration);
	createMany.configure(configuration);
	enterTodoEdit.configure(configuration);
	saveTodoEdit.configure(configuration);
	exitTodoEdit.configure(configuration);
	filter.configure(configuration);
	counterUpdate.configure(configuration);
	checkTodoItemCount.configure(configuration);
	toggleStates.configure(configuration);
}

export {
	createMany as createManyAction,
	create as createTodoAction,
	toggleComplete as toggleCompleteTodoAction,
	destroy as destroyTodoAction,
	enterTodoEdit as enterTodoEditAction,
	saveTodoEdit as saveTodoEditAction,
	exitTodoEdit as exitTodoEditAction,
	filter as filterAction,
	toggleAll as toggleAllAction,
	clearCompleted as clearCompletedAction,
	registerAll as registerTodoActions
};
