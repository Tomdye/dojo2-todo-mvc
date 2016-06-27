import createAction from 'dojo-actions/createAction';
import createApp from 'dojo-app/createApp';
import request from 'dojo-core/request';
import createRoute from 'dojo-routing/createRoute';
import createRouter from 'dojo-routing/createRouter';
import createHashHistory from 'dojo-routing/history/createHashHistory';
import createPanel from 'dojo-widgets/createPanel';
import createTextInput from 'dojo-widgets/createTextInput';
import createWidget from 'dojo-widgets/createWidget';
import createMemoryStore from 'dojo-widgets/util/createMemoryStore';

import {
	createMany,
	filter,
	toggleAll,
	clearCompleted,
	checkTodoItemCount,
	toggleStates,
	counterUpdate,
	create,
	toggleComplete,
	destroy,
	enterTodoEdit,
	saveTodoEdit,
	exitTodoEdit
} from './actions/todoActions';
import todoRegistryFactory from './registry/createTodoRegistry';
import createTodoList from './widgets/createTodoList';
import createCheckboxInput from './widgets/createCheckboxInput';

const app = createApp({ toAbsMid: require.toAbsMid });
const router = createRouter();
const history = createHashHistory();

history.on('change', (event) => {
	router.dispatch({}, event.value);
});

router.append(createRoute({
	path: '/completed',
	exec (request) {
		filter.do({ 'filter': 'completed' });
	}
}));

router.append(createRoute({
	path: '/all',
	exec (request) {
		filter.do({ 'filter': 'none' });
	}
}));

router.append(createRoute({
	path: '/active',
	exec (request) {
		filter.do({ 'filter': 'active' });
	}
}));

const widgetStore = createMemoryStore({
	data: [
		{'id': 'todo-app', 'classes': ['todoapp']},
		{'id': 'todo-list', 'classes': ['todo-list'], children: []},
		{'id': 'todo-header-title', 'label': 'todos'},
		{'id': 'todo-new-item', 'classes': ['new-todo'], 'placeholder': 'What needs to be done?'},
		{'id': 'todo-add', 'label': 'Add Todo'},
		{'id': 'main-section', 'classes': ['main', 'hidden']},
		{'id': 'todo-footer', 'classes': ['footer', 'hidden']},
		{'id': 'todo-toggle-all', 'classes': ['toggle-all'], 'checked': false},
		{'id': 'todo-count', 'classes': ['todo-count']},
		{'id': 'todo-count-number', 'label': '0 '},
		{'id': 'todo-count-label', 'label': 'items left'},
		{'id': 'filters', 'classes': ['filters']},
		{'id': 'all-filter', 'label': 'All', 'classes': ['selected']},
		{'id': 'active-filter', 'label': 'Active'},
		{'id': 'completed-filter', 'label': 'Completed'},
		{'id': 'clear-completed', 'label': 'Clear completed', 'classes': ['clear-completed']}
	]
});

app.registerStore('widget-store', widgetStore);

const addTodo = createAction({
	do(e: any) {
		const event: KeyboardEvent = e.event;
		const target = <any> event.target;
		if (event.keyCode === 13 && target.value) {
			widgetStore.patch({'id': 'todo-new-item', 'value': ''});
			create.do({
				label: target.value
			});
		}
	}
});

const gotoCompleted = createAction({
	do() {
		history.set('completed');
	}
});

const gotoActive = createAction({
	do() {
		history.set('active');
	}
});

const gotoAll = createAction({
	do() {
		history.set('all');
	}
});

app.registerAction('add-todo', addTodo);
app.registerAction('create', create);
app.registerAction('toggle-all', toggleAll);
app.registerAction('goto-completed', gotoCompleted);
app.registerAction('goto-active', gotoActive);
app.registerAction('goto-all', gotoAll);
app.registerAction('clear-completed', clearCompleted);
app.registerAction('create-many', createMany);
app.registerAction('filter', filter);
app.registerAction('check-item-count', checkTodoItemCount);
app.registerAction('toggle-states', toggleStates);
app.registerAction('update-counter', counterUpdate);
app.registerAction('toggle-complete', toggleComplete);
app.registerAction('destroy', destroy);
app.registerAction('enter-todo-edit', enterTodoEdit);
app.registerAction('save-todo', saveTodoEdit);
app.registerAction('exit-todo-edit', exitTodoEdit);

app.loadDefinition({
	widgets: [
		{
			id: 'todo-app',
			factory: createPanel,
			stateFrom: 'widget-store',
			options: {
				tagName: 'section'
			}
		},
		{
			id: 'todo-new-item',
			factory: createTextInput,
			stateFrom: 'widget-store',
			listeners: {
				keypress: 'add-todo'
			}
		},
		{
			id: 'main-section',
			factory: createPanel,
			stateFrom: 'widget-store',
			options: {
				tagName: 'section'
			}
		},
		{
			id: 'todo-toggle-all',
			factory: createCheckboxInput,
			stateFrom: 'widget-store',
			listeners: {
				change: 'toggle-all'
			}
		},
		{
			id: 'todo-list',
			factory: createTodoList,
			stateFrom: 'widget-store',
			options: {
				widgetRegistry: todoRegistryFactory({ widgetStore })
			}
		}
	],
	customElements: [
		{
			name: 'dojo-widget',
			factory: createWidget
		},
		{
			name: 'dojo-parent-widget',
			factory: createPanel
		}
	]
});

Promise.all([
	app.getAction('create-many'),
	app.getAction('filter'),
	app.getAction('toggle-all'),
	app.getAction('clear-completed'),
	app.getAction('check-item-count'),
	app.getAction('toggle-states'),
	app.getAction('update-counter'),
	app.getAction('create'),
	app.getAction('toggle-complete'),
	app.getAction('destroy'),
	app.getAction('enter-todo-edit'),
	app.getAction('save-todo'),
	app.getAction('exit-todo-edit')
]).then(() => {
	request.get('todos', { responseType: 'json' }).then((response) => {
		const todos = response.data;
		createMany.do(todos);
	});
	history.set(history.current);
	app.realize(document.body);
});

