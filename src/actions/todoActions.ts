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
			.then((children: string[]) => widgetStore.patch({ id: parentId, children }));
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

function setComplete(todoItemState: any) {
	if (todoItemState.classes.indexOf(todoCompleteClass) < 0) {
		todoItemState.classes.push(todoCompleteClass);
	}
	return todoItemState.classes;
}

function setIncomplete(todoItemState: any) {
	return todoItemState.classes.filter((className: string) => className !== todoCompleteClass);
}

const toggleComplete: AnyAction = createAction({
	configure,
	do(options: any) {
		const widgetStore = this.configuration.widgetStore;
		const itemId = options.id;
		const patchObject: CompletePatchObject = {
			id: itemId,
			completed: options.complete
		};

		return widgetStore.get(itemId)
			.then((todoItemState: any) => options.complete ? setComplete(todoItemState) : setIncomplete(todoItemState))
			.then((classes: string[]) => {
				patchObject.classes = classes;
				return widgetStore.patch(patchObject);
			})
			.then(() => {
				return request.post('todo/' + itemId + '/update', {
					headers: {
						'Content-Type': 'application/json'
					},
					data: {
						id: itemId,
						completed: options.complete
					}
				});
			});
	}
});

const destroy: AnyAction = createAction({
	configure,
	do(options: any) {
		const widgetStore = this.configuration.widgetStore;
		const parentId = this.configuration.parentId;

		const childId = options.id;

		return widgetStore.get(parentId)
			.then((todosState: WidgetStateRecord) => todosState.children.filter((id) => id !== childId))
			.then((children: string[]) => widgetStore.patch({ id: parentId, children }))
			.then(() => {
				return request.delete('todo/' + childId + '/delete', {
					headers: {
						'Content-Type': 'application/json'
					},
					data: {
						id: childId
					}
				});
			})
			.then(() => widgetStore.delete(childId));
	}
});

function registerAll (configuration: TodoActionConfiguration) {
	create.configure(configuration);
	destroy.configure(configuration);
	toggleComplete.configure(configuration);
	createMany.configure(configuration);
}

export {
	createMany as createManyAction,
	create as createTodoAction,
	toggleComplete as toggleCompleteTodoAction,
	destroy as destroyTodoAction,
	registerAll as registerTodoActions
};
