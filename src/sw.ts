interface ResponseConstructor {
	new (...args: any[]): Response;
	prototype: Response;
}

declare const Response: ResponseConstructor;

interface RequestConstructor {
	new (...args: any[]): Request;
	prototype: Request;
}

declare const Request: RequestConstructor;

/*const payload: any[] = [{id: 1, label: 'todo 1', completed: false},
	{id: 2, label: 'todo 2', completed: true}
];*/

self.addEventListener('install', function(event: InstallEvent) {
	/*event.waitUntil(
		self.caches.open('todos').then(cache => {
			return cache.put(
				new Request('/todos'), new Response(JSON.stringify(payload), { headers: { 'Content-Type': 'application/json'}}))
				.then(() => self.skipWaiting());
		})
	);*/
});

self.addEventListener('activate', function(event: any) {
	event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function(event: FetchEvent) {

	if (/\/todos$/.test(event.request.url)) {
		if (event.request.method === 'GET') {
			event.respondWith(self.caches.match(new Request('/todos')).then(response => {
				return response;
			}));
		}
	} else if (/\/todo\/\d+$/.test(event.request.url) && event.request.method === 'POST') {
		event.respondWith(self.caches.match(new Request('/todos')).then(response => {
			return response.clone().json().then((resbody: any) => {
				return event.request.clone().json().then(reqbody => {
					(<[]> resbody).push(reqbody);
					return self.caches.open('todos').then(cache => {
						return cache.put(
							new Request('/todos'), new Response(JSON.stringify(resbody), { headers: { 'Content-Type': 'application/json'}}))
							.then(() => {
								return new Response(JSON.stringify(reqbody), { headers: { 'Content-Type': 'application/json'}});
							});
					});
				});
			});
		}));
	} else if (/\/todo\/\d+\/update$/.test(event.request.url) && event.request.method === 'POST') {
		event.respondWith(
			self.caches.match(new Request('/todos')).then(response => {
				return response.clone().json().then((resbody: any) => {
					return event.request.clone().json().then((reqbody: any) => {
						const updatedResponse = resbody.map((item: any) => {
							if (item.id === reqbody.id) {
								return Object.assign(item, {completed: reqbody.completed});
							}
							return item;
						});
						return self.caches.open('todos').then(cache => {
							return cache.put(
								new Request('/todos'), new Response(JSON.stringify(updatedResponse), { headers: { 'Content-Type': 'application/json'}}))
								.then(() => {
									return new Response('Updated');
								});
						});
					});
				});
			})
		);
	} else if (/\/todo\/\d+\/delete$/.test(event.request.url) && event.request.method === 'DELETE') {
		event.respondWith(
			self.caches.match(new Request('/todos')).then(response => {
				return event.request.json().then((reqBody: any) => {
					return response.clone().json().then((resBody: any) => {
						const updateBody = resBody.filter((item: any) => item.id !== reqBody.id);
						return self.caches.open('todos').then(cache => {
							return cache.put(
								new Request('/todos'), new Response(JSON.stringify(updateBody), { headers: { 'Content-Type': 'application/json'}}))
								.then(() => {
									return new Response('Deleted');
								});
						});
					});
				});
			})
		);
	} else {
		event.respondWith(
			self.caches.match(event.request)
			.then(function(response) {
				if (response) {
					return response;
				}
				const fetchRequest = event.request.clone();
				return self.fetch(fetchRequest).then(
					function(response) {
						if (!response || response.status !== 200 || response.type !== 'basic') {
							return response;
						}
						const responseToCache = response.clone();
						self.caches.open('static')
						.then(function(cache) {
							cache.put(event.request, responseToCache);
						});
						return response;
					}
				);
			})
		);
	}
});
