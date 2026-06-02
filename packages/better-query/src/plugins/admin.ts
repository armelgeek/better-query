import { createCrudEndpoint } from "../endpoints/crud-endpoint";
import { Plugin } from "../types/plugins";

export interface AdminPluginOptions {
	/** Customize the path for the Admin Studio GUI (default: "/admin") */
	path?: string;
	/** Title of the Admin Studio dashboard */
	title?: string;
}

/**
 * Admin Studio Plugin for Better Query
 * Exposes a self-contained, real-time GUI database admin console at `/admin`
 */
export function adminPlugin(options: AdminPluginOptions = {}): Plugin {
	const adminPath = options.path || "/admin";
	const studioTitle = options.title || "Better Query Studio";

	return {
		id: "admin",
		hooks: {},
		init: () => {
			console.log(`[Admin Studio] Mounted at ${adminPath}`);
		},
		endpoints: {
			// 1. JSON API for Schema inspection
			getSchema: createCrudEndpoint(
				`${adminPath}/schema`,
				{ method: "GET" },
				async (ctx) => {
					const queryContext = ctx.context;
					const schemaMap = queryContext.schemas;
					const resources: Array<{ name: string; fields: any }> = [];

					for (const [name, config] of schemaMap.entries()) {
						resources.push({
							name,
							fields: config.fields,
						});
					}

					return ctx.json({
						title: studioTitle,
						resources,
					});
				},
			),

			// 2. Self-contained HTML GUI Page
			getAdminPage: createCrudEndpoint(
				adminPath,
				{ method: "GET" },
				async (ctx) => {
					const queryContext = ctx.context;

					// Find realtime WebSocket settings
					const realtimePlugin = queryContext.options?.plugins?.find(
						(p: any) => p.id === "realtime",
					);
					const wsPort = realtimePlugin?.options?.port || 3001;
					const wsPath = realtimePlugin?.options?.path || "/realtime";

					const htmlContent = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${studioTitle} ✦ Admin Studio</title>
	<!-- Tailwind CSS and Google Fonts -->
	<script src="https://cdn.tailwindcss.com"></script>
	<script>
		tailwind.config = {
			darkMode: 'class',
			theme: {
				extend: {
					colors: {
						brand: {
							50: '#f5f3ff',
							100: '#ede9fe',
							500: '#8b5cf6',
							600: '#7c3aed',
							700: '#6d28d9',
							950: '#0b071e',
						}
					}
				}
			}
		}
	</script>
	<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
	<style>
		body {
			font-family: 'Plus Jakarta Sans', sans-serif;
			background-color: #030712;
		}
		code, pre {
			font-family: 'JetBrains Mono', monospace;
		}
		.glass {
			background: rgba(17, 24, 39, 0.7);
			backdrop-filter: blur(12px);
			border: 1px solid rgba(255, 255, 255, 0.05);
		}
		.pulse-glow {
			box-shadow: 0 0 12px rgba(16, 185, 129, 0.4);
		}
	</style>
	<!-- AlpineJS and Lucide Icons -->
	<script src="https://unpkg.com/lucide@latest"></script>
	<script defer src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js"></script>
</head>
<body class="text-slate-100 overflow-hidden h-screen" x-data="adminStudio()">

	<!-- Main Shell -->
	<div class="flex h-full w-full bg-brand-950/20">

		<!-- Sidebar -->
		<aside class="w-72 glass flex flex-col h-full border-r border-slate-800/80 z-20">
			<!-- Logo Header -->
			<div class="p-6 border-b border-slate-800/50 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<div class="h-8 w-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
						<span class="text-white font-bold text-lg">✦</span>
					</div>
					<div>
						<h1 class="font-bold text-sm leading-tight text-white">${studioTitle}</h1>
						<span class="text-[10px] text-brand-500 uppercase tracking-widest font-semibold">Admin Panel</span>
					</div>
				</div>
				<!-- Realtime Status Badge -->
				<div class="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-900/60 border border-slate-800">
					<span class="h-2 w-2 rounded-full bg-emerald-500" :class="wsStatus === 'open' ? 'bg-emerald-500 animate-pulse pulse-glow' : 'bg-rose-500'"></span>
					<span class="text-[9px] uppercase tracking-wider font-bold text-slate-400" x-text="wsStatus === 'open' ? 'Live' : 'Offline'"></span>
				</div>
			</div>

			<!-- Resource Navigation List -->
			<div class="flex-1 overflow-y-auto px-4 py-4 space-y-1">
				<span class="text-[10px] font-bold text-slate-500 uppercase px-3 tracking-wider block mb-2">Databases / Resources</span>
				<template x-for="res in schema.resources" :key="res.name">
					<button 
						@click="selectResource(res.name)"
						class="w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-all group duration-200"
						:class="activeResource === res.name ? 'bg-brand-500/10 text-brand-100 border-l-2 border-brand-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/30 hover:text-slate-200'"
					>
						<div class="flex items-center gap-2.5">
							<i data-lucide="database" class="w-4 h-4 transition-transform group-hover:scale-110" :class="activeResource === res.name ? 'text-brand-500' : 'text-slate-500'"></i>
							<span class="text-sm tracking-wide capitalize" x-text="res.name"></span>
						</div>
						<span class="text-xs bg-slate-800 px-2 py-0.5 rounded-full text-slate-400 group-hover:bg-slate-700/50" x-text="activeResource === res.name ? items.length : '•'"></span>
					</button>
				</template>
			</div>

			<!-- System Stats footer -->
			<div class="p-4 border-t border-slate-800/50 bg-slate-950/40">
				<div class="flex items-center gap-3 text-xs text-slate-400">
					<i data-lucide="activity" class="w-4 h-4 text-brand-500"></i>
					<div>
						<p class="font-medium text-slate-300">Connection Engine</p>
						<p class="text-[10px] text-slate-500" x-text="'WS Endpoint: :' + wsPort"></p>
					</div>
				</div>
			</div>
		</aside>

		<!-- Main Workspace Content -->
		<main class="flex-1 flex flex-col h-full overflow-hidden">
			<!-- Header Control Bar -->
			<header class="h-16 border-b border-slate-800/80 bg-slate-950/30 px-8 flex items-center justify-between z-10">
				<div class="flex items-center gap-4">
					<h2 class="text-lg font-bold text-white tracking-wide capitalize" x-text="activeResource || 'Select a Resource'"></h2>
					<div class="h-4 w-px bg-slate-800"></div>
					<div class="flex items-center gap-2 text-xs text-slate-400">
						<span class="px-2 py-1 rounded bg-slate-900 border border-slate-800 font-mono text-[10px]" x-text="activeResource ? '/' + activeResource + '/list' : ''"></span>
					</div>
				</div>

				<div class="flex items-center gap-3" x-show="activeResource">
					<!-- Refresh Button -->
					<button @click="fetchItems()" class="p-2 hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-800/40 transition-colors">
						<i data-lucide="rotate-cw" class="w-4 h-4"></i>
					</button>
					<!-- Add Record Button -->
					<button 
						@click="openCreateModal()"
						class="px-4 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-semibold text-sm rounded-lg flex items-center gap-2 shadow-lg shadow-brand-500/10 active:scale-95 transition-all"
					>
						<i data-lucide="plus" class="w-4 h-4"></i>
						<span>Add Record</span>
					</button>
				</div>
			</header>

			<!-- Workspace body -->
			<div class="flex-1 p-8 overflow-y-auto space-y-6">
				<!-- Empty state -->
				<div x-show="!activeResource" class="h-full flex flex-col items-center justify-center text-center space-y-4">
					<div class="h-16 w-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 shadow-inner">
						<i data-lucide="database" class="w-8 h-8"></i>
					</div>
					<div>
						<h3 class="text-lg font-bold text-slate-200">No Resource Selected</h3>
						<p class="text-sm text-slate-500 max-w-sm mt-1">Please select one of the registered database resources from the left sidebar to explore and manage your data.</p>
					</div>
				</div>

				<!-- Search, Filter & Table area -->
				<div x-show="activeResource" class="space-y-4" x-transition>
					
					<!-- Search / Controls -->
					<div class="flex items-center justify-between gap-4">
						<div class="relative flex-1 max-w-md">
							<span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
								<i data-lucide="search" class="w-4 h-4"></i>
							</span>
							<input 
								type="text" 
								x-model="searchQuery" 
								@input.debounce.300ms="fetchItems()" 
								placeholder="Quick search records..." 
								class="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
							>
						</div>

						<div class="text-xs text-slate-500 font-medium">
							Showing <span class="text-slate-300 font-bold" x-text="items.length"></span> records
						</div>
					</div>

					<!-- Table -->
					<div class="glass rounded-xl overflow-hidden shadow-2xl shadow-black/40">
						<div class="overflow-x-auto">
							<table class="w-full text-left border-collapse">
								<thead>
									<tr class="border-b border-slate-800 bg-slate-900/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
										<template x-for="field in activeFields" :key="field">
											<th class="px-6 py-4" x-text="field"></th>
										</template>
										<th class="px-6 py-4 text-right">Actions</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-slate-800/50 text-sm text-slate-300">
									<!-- No records -->
									<template x-if="items.length === 0">
										<tr>
											<td :colspan="activeFields.length + 1" class="text-center py-12 text-slate-500">
												<i data-lucide="package-open" class="w-8 h-8 mx-auto mb-2 text-slate-600"></i>
												No records found in database resource.
											</td>
										</tr>
									</template>

									<!-- Records rows -->
									<template x-for="item in items" :key="item.id || Math.random()">
										<tr class="hover:bg-slate-800/10 transition-colors">
											<template x-for="field in activeFields" :key="field">
												<td class="px-6 py-3.5 max-w-xs truncate">
													<!-- Formatter block -->
													<template x-if="field === 'id'">
														<span class="font-mono text-xs bg-slate-900 px-2 py-1 rounded text-brand-400 cursor-pointer hover:bg-slate-850 active:scale-95 transition-all" @click="navigator.clipboard.writeText(item[field])" title="Click to copy" x-text="item[field]"></span>
													</template>
													<template x-if="field !== 'id' && typeof item[field] === 'boolean'">
														<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" :class="item[field] ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-900 text-slate-500 border border-slate-800'">
															<span class="h-1.5 w-1.5 rounded-full" :class="item[field] ? 'bg-emerald-400' : 'bg-slate-500'"></span>
															<span x-text="item[field] ? 'True' : 'False'"></span>
														</span>
													</template>
													<template x-if="field !== 'id' && typeof item[field] !== 'boolean' && typeof item[field] === 'object' && item[field] !== null">
														<span class="font-mono text-xs text-slate-500" x-text="JSON.stringify(item[field])"></span>
													</template>
													<template x-if="field !== 'id' && typeof item[field] !== 'boolean' && (typeof item[field] !== 'object' || item[field] === null)">
														<span class="text-slate-300" x-text="item[field] !== null ? item[field] : '—'"></span>
													</template>
												</td>
											</template>
											<!-- Action Controls -->
											<td class="px-6 py-3.5 text-right space-x-1 whitespace-nowrap">
												<button @click="openEditModal(item)" class="p-1.5 hover:bg-brand-500/10 text-slate-400 hover:text-brand-400 rounded-md transition-colors" title="Edit row">
													<i data-lucide="edit" class="w-4 h-4"></i>
												</button>
												<button @click="deleteItem(item.id)" class="p-1.5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded-md transition-colors" title="Delete row">
													<i data-lucide="trash-2" class="w-4 h-4"></i>
												</button>
											</td>
										</tr>
									</template>
								</tbody>
							</table>
						</div>
					</div>

				</div>
			</div>
		</main>
	</div>

	<!-- CREATE/EDIT DIALOG MODAL -->
	<div 
		x-show="modalOpen" 
		class="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
		x-transition
	>
		<div 
			@click.away="modalOpen = false" 
			class="glass w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900"
		>
			<div class="px-6 py-4 border-b border-slate-850 flex items-center justify-between">
				<h3 class="font-bold text-white text-base" x-text="modalMode === 'create' ? 'Create Record' : 'Edit Record'"></h3>
				<button @click="modalOpen = false" class="text-slate-400 hover:text-slate-200">
					<i data-lucide="x" class="w-5 h-5"></i>
				</button>
			</div>

			<form @submit.prevent="saveItem" class="p-6 space-y-4">
				<div class="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
					<template x-for="[fieldName, fieldAttrs] in Object.entries(schema.resources.find(r => r.name === activeResource)?.fields || {})" :key="fieldName">
						<!-- Skip ID field for creation -->
						<div class="space-y-1.5" x-show="fieldName !== 'id' || modalMode === 'edit'">
							<label class="text-xs font-semibold text-slate-400 uppercase tracking-wide capitalize" x-text="fieldName"></label>
							
							<!-- String type -->
							<template x-if="fieldAttrs.type === 'string' && fieldName !== 'id'">
								<input 
									type="text" 
									x-model="formData[fieldName]"
									class="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
								>
							</template>

							<!-- ID read-only field -->
							<template x-if="fieldName === 'id'">
								<input 
									type="text" 
									x-model="formData[fieldName]"
									disabled
									class="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-500 cursor-not-allowed font-mono"
								>
							</template>

							<!-- Number type -->
							<template x-if="fieldAttrs.type === 'number'">
								<input 
									type="number" 
									x-model.number="formData[fieldName]"
									class="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
								>
							</template>

							<!-- Date type -->
							<template x-if="fieldAttrs.type === 'date'">
								<input 
									type="date" 
									x-model="formData[fieldName]"
									class="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
								>
							</template>

							<!-- Boolean type -->
							<template x-if="fieldAttrs.type === 'boolean'">
								<div class="flex items-center">
									<input 
										type="checkbox" 
										x-model="formData[fieldName]"
										class="h-4.5 w-4.5 rounded border-slate-850 bg-slate-950 text-brand-600 focus:ring-brand-500 focus:ring-offset-slate-900"
									>
									<span class="ml-2 text-sm text-slate-300">Set boolean value to true</span>
								</div>
							</template>

							<!-- JSON / Object type -->
							<template x-if="fieldAttrs.type === 'json'">
								<textarea 
									x-model="formData[fieldName]"
									rows="3"
									placeholder="JSON format..."
									class="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-slate-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
								></textarea>
							</template>
						</div>
					</template>
				</div>

				<div class="pt-4 border-t border-slate-850 flex items-center justify-end gap-3">
					<button 
						type="button" 
						@click="modalOpen = false"
						class="px-4 py-2 rounded-lg border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-slate-200 text-sm font-semibold transition-colors"
					>
						Cancel
					</button>
					<button 
						type="submit"
						class="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-lg shadow-lg shadow-brand-500/10 active:scale-95 transition-all"
					>
						Save
					</button>
				</div>
			</form>
		</div>
	</div>

	<!-- SCRIPT CONTROLLER -->
	<script>
		function adminStudio() {
			return {
				schema: { resources: [] },
				wsStatus: 'closed',
				wsConn: null,
				activeResource: '',
				activeFields: [],
				items: [],
				searchQuery: '',
				wsPort: ${wsPort},
				wsPath: "${wsPath}",

				// Modal States
				modalOpen: false,
				modalMode: 'create',
				formData: {},
				editRecordId: null,

				async init() {
					await this.fetchSchema();
					
					// Re-trigger Lucide Icons
					this.$nextTick(() => {
						lucide.createIcons();
					});

					// Connect Realtime Websocket
					this.connectWS();
				},

				async fetchSchema() {
					try {
						const res = await fetch(window.location.origin + window.location.pathname + '/schema');
						this.schema = await res.json();
						if (this.schema.resources.length > 0) {
							this.selectResource(this.schema.resources[0].name);
						}
					} catch (e) {
						console.error("Failed to load Studio schema:", e);
					}
				},

				selectResource(name) {
					this.activeResource = name;
					this.searchQuery = '';
					
					// Fetch fields
					const resSchema = this.schema.resources.find(r => r.name === name);
					if (resSchema) {
						this.activeFields = Object.keys(resSchema.fields);
					}
					
					this.fetchItems();
				},

				async fetchItems() {
					if (!this.activeResource) return;
					
					const apiBase = window.location.origin + window.location.pathname.replace(/\/admin$/, "");
					let url = apiBase + '/' + this.activeResource + '/list';
					if (this.searchQuery) {
						url += '?q=' + encodeURIComponent(this.searchQuery);
					}
					
					try {
						const res = await fetch(url);
						const resData = await res.json();
						this.items = resData.data?.items || [];
					} catch (e) {
						console.error("Failed to fetch items:", e);
					}

					this.$nextTick(() => {
						lucide.createIcons();
					});
				},

				connectWS() {
					const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
					const wsUrl = wsProtocol + '//' + window.location.hostname + ':' + this.wsPort + this.wsPath;
					
					try {
						this.wsConn = new WebSocket(wsUrl);
						
						this.wsConn.onopen = () => {
							this.wsStatus = 'open';
							console.log("[Admin Studio] Websocket Live connected!");
							
							// Auto-subscribe to all active resource channels
							this.schema.resources.forEach(r => {
								this.wsConn.send(JSON.stringify({
									type: 'subscribe',
									channel: 'resource:' + r.name
								}));
							});
						};

						this.wsConn.onmessage = (event) => {
							const msg = JSON.parse(event.data);
							if (msg.type === 'data_change') {
								console.log("[Admin Studio] Received live change notification:", msg);
								// If change is for current active resource, hot-reload the data!
								const resourceChannel = 'resource:' + this.activeResource;
								if (msg.channel === resourceChannel) {
									this.fetchItems();
								}
							}
						};

						this.wsConn.onclose = () => {
							this.wsStatus = 'closed';
							setTimeout(() => this.connectWS(), 4000); // Auto reconnect
						};

						this.wsConn.onerror = () => {
							this.wsStatus = 'closed';
						};
					} catch (err) {
						this.wsStatus = 'closed';
					}
				},

				openCreateModal() {
					this.modalMode = 'create';
					this.formData = {};
					
					// Populate defaults
					const resSchema = this.schema.resources.find(r => r.name === this.activeResource);
					if (resSchema) {
						Object.entries(resSchema.fields).forEach(([name, attrs]) => {
							if (attrs.type === 'boolean') {
								this.formData[name] = false;
							} else {
								this.formData[name] = '';
							}
						});
					}
					
					this.modalOpen = true;
					this.$nextTick(() => { lucide.createIcons(); });
				},

				openEditModal(item) {
					this.modalMode = 'edit';
					this.editRecordId = item.id;
					this.formData = { ...item };
					
					// Format dates if any
					const resSchema = this.schema.resources.find(r => r.name === this.activeResource);
					if (resSchema) {
						Object.entries(resSchema.fields).forEach(([name, attrs]) => {
							if (attrs.type === 'date' && item[name]) {
								// Extract YYYY-MM-DD
								this.formData[name] = new Date(item[name]).toISOString().split('T')[0];
							} else if (attrs.type === 'json' && item[name]) {
								this.formData[name] = JSON.stringify(item[name], null, 2);
							}
						});
					}

					this.modalOpen = true;
					this.$nextTick(() => { lucide.createIcons(); });
				},

				async saveItem() {
					const apiBase = window.location.origin + window.location.pathname.replace(/\/admin$/, "");
					
					// Parse JSON values
					const payload = { ...this.formData };
					const resSchema = this.schema.resources.find(r => r.name === this.activeResource);
					
					if (resSchema) {
						for (const [name, attrs] of Object.entries(resSchema.fields)) {
							if (attrs.type === 'json' && payload[name]) {
								try {
									payload[name] = JSON.parse(payload[name]);
								} catch (e) {
									alert("Invalid JSON format for field: " + name);
									return;
								}
							}
						}
					}

					let url = apiBase + '/' + this.activeResource + '/create';
					let method = 'POST';

					if (this.modalMode === 'edit') {
						url = apiBase + '/' + this.activeResource + '/update/' + this.editRecordId;
						method = 'PATCH';
						// Wrap parameters for update
						delete payload.id;
					}

					try {
						const res = await fetch(url, {
							method: method,
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify(payload)
						});
						
						if (!res.ok) {
							const errorData = await res.json();
							alert("Error: " + (errorData.error || res.statusText));
							return;
						}
						
						this.modalOpen = false;
						this.fetchItems();
					} catch (e) {
						alert("Failed to save item: " + e);
					}
				},

				async deleteItem(id) {
					if (!confirm("Are you sure you want to delete this record?")) return;
					
					const apiBase = window.location.origin + window.location.pathname.replace(/\/admin$/, "");
					const url = apiBase + '/' + this.activeResource + '/delete/' + id;
					
					try {
						const res = await fetch(url, { method: 'DELETE' });
						if (!res.ok) {
							const errorData = await res.json();
							alert("Error deleting record: " + (errorData.error || res.statusText));
							return;
						}
						this.fetchItems();
					} catch (e) {
						alert("Failed to delete item: " + e);
					}
				}
			}
		}
	</script>
</body>
</html>`;

					return new Response(htmlContent, {
						headers: {
							"Content-Type": "text/html",
						},
					});
				},
			),
		},
	};
}
