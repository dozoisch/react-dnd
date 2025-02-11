/* tslint:disable no-shadowed-variable */
declare var require: any
import * as React from 'react'
import {
	DragDropManager,
	BackendFactory,
	createDragDropManager,
} from 'dnd-core'
import checkDecoratorArguments from './utils/checkDecoratorArguments'
import { ContextComponent } from './interfaces'
import { isRefable } from './utils/isRefable'
const invariant = require('invariant')
const hoistStatics = require('hoist-non-react-statics')

/**
 * The React context type
 */
export interface DragDropContext<BC> {
	dragDropManager: DragDropManager<BC> | undefined
}

/**
 * Create the React Context
 */
export const context = React.createContext<DragDropContext<any>>({
	dragDropManager: undefined,
})
export const { Consumer, Provider } = context

/**
 * Creates the context object we're providing
 * @param backend
 * @param context
 */
export function createChildContext<BackendContext>(
	backend: BackendFactory,
	context?: BackendContext,
	debugMode?: boolean,
) {
	return {
		dragDropManager: createDragDropManager(backend, context, debugMode),
	}
}

export type DragDropContextProviderProps<BackendContext> =
	| {
			manager: DragDropManager<BackendContext>
	  }
	| {
			backend: BackendFactory
			context?: BackendContext
			debugMode?: boolean
	  }

/**
 * A React component that provides the React-DnD context
 */
export const DragDropContextProvider: React.FC<
	DragDropContextProviderProps<any>
> = ({ children, ...props }) => {
	const contextValue =
		'manager' in props
			? { dragDropManager: props.manager }
			: createChildContext(props.backend, props.context, props.debugMode)
	return <Provider value={contextValue}>{children}</Provider>
}

/**
 * Wrap the root component of your application with DragDropContext decorator to set up React DnD.
 * This lets you specify the backend, and sets up the shared DnD state behind the scenes.
 * @param backendFactory The DnD backend factory
 * @param backendContext The backend context
 */
export function DragDropContext(
	backendFactory: BackendFactory,
	backendContext?: any,
	debugMode?: boolean,
) {
	checkDecoratorArguments('DragDropContext', 'backend', backendFactory)
	const childContext = createChildContext(
		backendFactory,
		backendContext,
		debugMode,
	)

	return function decorateContext<
		TargetClass extends
			| React.ComponentClass<any>
			| React.StatelessComponent<any>
	>(DecoratedComponent: TargetClass): TargetClass & ContextComponent<any> {
		const Decorated = DecoratedComponent as any
		const displayName = Decorated.displayName || Decorated.name || 'Component'

		class DragDropContextContainer extends React.Component<any>
			implements ContextComponent<any> {
			public static DecoratedComponent = DecoratedComponent
			public static displayName = `DragDropContext(${displayName})`

			private ref: React.RefObject<any> = React.createRef()

			public getDecoratedComponentInstance() {
				invariant(
					this.ref.current,
					'In order to access an instance of the decorated component, it must either be a class component or use React.forwardRef()',
				)
				return this.ref.current
			}

			public getManager = () => childContext.dragDropManager

			public render() {
				return (
					<Provider value={childContext}>
						{/* If decorated is an FC, then the reff will be blank */}
						<Decorated
							{...this.props}
							ref={isRefable(Decorated) ? this.ref : null}
						/>
					</Provider>
				)
			}
		}

		return hoistStatics(
			DragDropContextContainer,
			DecoratedComponent,
		) as TargetClass & DragDropContextContainer
	}
}
