
import createMemoryStore from 'dojo-widgets/util/createMemoryStore';
import createPanel from 'dojo-widgets/createPanel';

import todoRegistryFactory from './registry/createTodoRegistry';
import { registerTodoActions, createTodoAction } from './actions/todoActions';
import createTodoList from './widgets/createTodoList';
import createWidget from 'dojo-widgets/createWidget';
import createTextInput from 'dojo-widgets/createTextInput';
import createTodoHeader from './widgets/createTodoHeader';
import createAction from 'dojo-actions/createAction';

import createRouter from 'dojo-routing/createRouter';
import createRoute from 'dojo-routing/createRoute';

import createHashHistory from 'dojo-routing/history/createHashHistory';
const history = createHashHistory();

import createApp from 'dojo-app/createApp';

const app = createApp({ toAbsMid: require.toAbsMid });
const router = createRouter();

history.on('change', (event) => {
	router.dispatch({}, event.value);
});

router.append(createRoute({
	path: '/completed',
	exec (request) {
		console.log('completed route');
	}
}));

router.append(createRoute({
	path: '/all',
	exec (request) {
		console.log('all route');
	}
}));

router.append(createRoute({
	path: '/active',
	exec (request) {
		console.log('active route');
	}
}));

const widgetStore = createMemoryStore({
	data: [
		{'id': 'todo-app', 'classes': ['todoapp']},
		{'id': 'todo-list', 'classes': ['todo-list'], children: []},
		{'id': 'todo-header-title', 'label': 'todos'},
		{'id': 'todo-new-item', 'classes': ['new-todo'], 'placeholder': 'What needs to be done?'},
		{'id': 'todo-add', 'label': 'Add Todo'},
		{'id': 'button', 'label': 'button'}
	]
});

app.registerStore('widget-store', widgetStore);

const gotoRoute = createAction({
	do() {
		history.set('/completed');
	}
});

const parentId = 'todo-list';
registerTodoActions({ widgetStore, parentId });

const addTodo = createAction({
	do(e: any) {
		const event: KeyboardEvent = e.event;
		if (event.keyCode === 13) {
			const target = <any> event.target;
			widgetStore.patch({'id': 'todo-new-item', 'value': ''});
			createTodoAction.do({
				label: target.value
			});
		}
	}
});

app.registerAction('add-todo', addTodo);
app.registerAction('goto-route', gotoRoute);

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
			id: 'todo-header',
			factory: createTodoHeader,
			stateFrom: 'widget-store'
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

app.realize(document.body);

