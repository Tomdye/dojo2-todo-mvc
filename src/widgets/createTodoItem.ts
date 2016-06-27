import createWidget, { Widget, WidgetState } from 'dojo-widgets/createWidget';
import createButton, { Button } from 'dojo-widgets/createButton';
import createTextInput, { TextInput } from 'dojo-widgets/createTextInput';
import createCheckboxInput, { CheckboxInput } from './createCheckboxInput';
import { h, VNode } from 'maquette/maquette';

import { destroy, toggleComplete, enterTodoEdit, saveTodoEdit, exitTodoEdit } from '../actions/todoActions';

export interface TodoItemMixin {
	childWidgets: TodoItemChildWidgets;
}

interface TodoItemChildWidgets {
	checkbox: CheckboxInput;
	button: Button;
	label: Widget<WidgetState>;
	editInput: TextInput;
}

interface TodoItemCheckedEvent extends Event {
	target: any;
}

export type TodoItem = Widget<any> & TodoItemMixin;

const createTodoItem = createWidget
	.mixin({
		initialize(instance) {
			instance.childWidgets = {
				checkbox: createCheckboxInput({
					listeners: { 'change': instance.checkboxChangeListener.bind(instance) }
				}),
				button: createButton({
					listeners: { 'click': instance.deleteButtonClickListener.bind(instance) }
				}),
				label: createWidget({
					listeners: { 'dblclick': instance.labelDblclickListener.bind(instance) },
					'tagName': 'label'
				}),
				editInput: createTextInput({
					listeners: {
						'keypress': instance.editInputKeyPressListener.bind(instance),
						'blur': instance.editInputBlurListener.bind(instance)
					}
				})
			};
		},
		mixin: {
			checkboxChangeListener(e: TodoItemCheckedEvent) {
				const todoItem: TodoItem = this;
				toggleComplete.do({
					id: todoItem.state.id,
					complete: e.target.checked
				});
			},
			deleteButtonClickListener(e: MouseEvent) {
				const todoItem: TodoItem = this;
				destroy.do({
					id: todoItem.state.id
				}).then(() => {
					todoItem.invalidate();
				});
			},
			labelDblclickListener(e: MouseEvent) {
				const todoItem: TodoItem = this;
				enterTodoEdit.do({id: todoItem.state.id});
			},
			editInputKeyPressListener(e: KeyboardEvent) {
				const todoItem: TodoItem = this;
				saveTodoEdit.do({id: todoItem.state.id, event: e});
			},
			editInputBlurListener(e: Event) {
				const todoItem: TodoItem = this;
				exitTodoEdit.do({id: todoItem.state.id, event: e});
			},
			childWidgets: <TodoItemChildWidgets> null,
			getChildrenNodes(): VNode[] {
				const todoItem: TodoItem = this;
				const checkbox = todoItem.childWidgets.checkbox;
				const button = todoItem.childWidgets.button;
				const label = todoItem.childWidgets.label;
				const editInput = todoItem.childWidgets.editInput;

				checkbox.setState({
					'classes': ['toggle']
				});

				button.setState({
					'classes': ['destroy']
				});

				editInput.setState({
					'classes': ['edit'],
					'value': todoItem.state.label
				});

				label.setState({
					'label': todoItem.state.label
				});

				const checkboxVNode = checkbox.render();
				checkboxVNode.properties.checked = todoItem.state.completed;

				return [
					h('div', {'class': 'view'}, [
						checkboxVNode,
						label.render(),
						button.render()
					]),
					editInput.render()
				];
			}
		}
	})
	.extend({
		tagName: 'li'
	});

export default createTodoItem;
