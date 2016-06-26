import createMemoryStore from 'dojo-widgets/util/createMemoryStore';
import createPanel from 'dojo-widgets/createPanel';

import todoRegistryFactory from './registry/createTodoRegistry';
import {
	registerTodoActions,
	createTodoAction,
	createManyAction,
	filterAction,
	toggleAllAction,
	clearCompletedAction
} from './actions/todoActions';
import createTodoList from './widgets/createTodoList';
import createWidget from 'dojo-widgets/createWidget';
import createCheckboxInput from './widgets/createCheckboxInput';
import createTextInput from 'dojo-widgets/createTextInput';
import createAction from 'dojo-actions/createAction';

import createRouter from 'dojo-routing/createRouter';
import createRoute from 'dojo-routing/createRoute';
import createHashHistory from 'dojo-routing/history/createHashHistory';
import request from 'dojo-core/request';

import createApp from 'dojo-app/createApp';

const app = createApp({ toAbsMid: require.toAbsMid });
const router = createRouter();
const history = createHashHistory();

history.on('change', (event) => {
	router.dispatch({}, event.value);
});

// get initial todos
request.get('todos', { responseType: 'json' }).then((response) => {
	const todos = response.data;
	createManyAction.do(todos);
});

router.append(createRoute({
	path: '/completed',
	exec (request) {
		filterAction.do({ 'filter': 'completed' });
	}
}));

router.append(createRoute({
	path: '/all',
	exec (request) {
		filterAction.do({ 'filter': 'none' });
	}
}));

router.append(createRoute({
	path: '/active',
	exec (request) {
		filterAction.do({ 'filter': 'active' });
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

const parentId = 'todo-list';
registerTodoActions({ widgetStore, parentId });

const addTodo = createAction({
	do(e: any) {
		const event: KeyboardEvent = e.event;
		const target = <any> event.target;
		if (event.keyCode === 13 && target.value) {
			widgetStore.patch({'id': 'todo-new-item', 'value': ''});
			createTodoAction.do({
				label: target.value
			});
		}
	}
});

const gotoCompleted = createAction({
	do(e: any) {
		history.set('completed');
	}
});

const gotoActive = createAction({
	do(e: any) {
		history.set('active');
	}
});

const gotoAll = createAction({
	do(e: any) {
		history.set('all');
	}
});

app.registerAction('add-todo', addTodo);
app.registerAction('toggle-all', toggleAllAction);
app.registerAction('goto-completed', gotoCompleted);
app.registerAction('goto-active', gotoActive);
app.registerAction('goto-all', gotoAll);
app.registerAction('clear-completed', clearCompletedAction);

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

history.set(history.current);

app.realize(document.body);

