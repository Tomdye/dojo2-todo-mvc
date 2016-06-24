(<DojoLoader.RootRequire> require).config({
	baseUrl: '../../',
	packages: [
		{ name: 'src', location: '_build/src' },
		{ name: 'dojo-actions', location: 'node_modules/dojo-actions/dist/umd' },
		{ name: 'dojo-app', location: 'node_modules/dojo-app/dist/umd' },
		{ name: 'dojo-dom', location: 'node_modules/dojo-dom/dist/umd' },
		{ name: 'dojo-compose', location: 'node_modules/dojo-compose/dist/umd' },
		{ name: 'dojo-routing', location: 'node_modules/dojo-routing/dist/umd' },
		{ name: 'dojo-core', location: 'node_modules/dojo-core/dist/umd' },
		{ name: 'dojo-widgets', location: 'node_modules/dojo-widgets/dist/umd' },
		{ name: 'immutable', location: 'node_modules/immutable/dist' },
		{ name: 'maquette', location: 'node_modules/maquette/dist' },
		{ name: 'rxjs', location: 'node_modules/@reactivex/rxjs/dist/amd' },
		{ name: 'dojo1', location: '_build/dojo1' },
		{ name: 'dojo', location: '_build/dojo1/dojo' },
		{ name: 'dijit', location: '_build/dojo1/dijit' }
	],
	map: {
		'*': {
			'maquette/maquette': 'maquette/maquette.min',
			'immutable/immutable': 'immutable/immutable.min'
		}
	}
});

if ('serviceWorker' in navigator) {
	navigator.serviceWorker.register('sw.js').then(function(registration) {
		console.log('registered');
	});

	navigator.serviceWorker.ready.then(function() {
		console.log('ready');
	});
}

require([ 'src/todo' ], function () {});

