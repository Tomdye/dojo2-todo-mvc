import createAction, { AnyAction } from 'dojo-actions/createAction';
import { CombinedRegistry } from 'dojo-app/createApp';
import { History } from 'dojo-routing/history/interfaces';
import { MemoryStore } from 'dojo-widgets/util/createMemoryStore';

export interface HistoryState {
	id?: string;
	history?: History;
}

interface WithStore {
	historyStore?: MemoryStore<HistoryState>;
}

function configure (registry: CombinedRegistry) {
	const action = <HistoryState> this;
	return registry.getStore('history-store').then((historyStore: MemoryStore<HistoryState>) =>
		historyStore.get('history').then((historyState: HistoryState) => {
			action.history = <History> historyState.history;
		})
	);
};

const createActionWithHistory = createAction.extend<HistoryState>({});

export const gotoCompletedRoute: AnyAction = createActionWithHistory({
	configure,
	do() {
		const { history } = <HistoryState> this;
		history.set('completed');
	}
});

export const gotoActiveRoute: AnyAction = createActionWithHistory({
	configure,
	do() {
		const { history } = <HistoryState> this;
		history.set('active');
	}
});

export const gotoAllRoute: AnyAction = createActionWithHistory({
	configure,
	do() {
		const { history } = <HistoryState> this;
		history.set('all');
	}
});

