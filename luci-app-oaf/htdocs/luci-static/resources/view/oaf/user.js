'use strict';
'require rpc';
'require ui';
'require dom';

const callGetAllUsers = rpc.declare({
	object: 'appfilter',
	method: 'get_all_users',
	params: ['flag', 'page']
});

const callGetAppFilterUser = rpc.declare({
	object: 'appfilter',
	method: 'get_app_filter_user'
});

const callSetAppFilterUser = rpc.declare({
	object: 'appfilter',
	method: 'set_app_filter_user',
	params: ['mode']
});

const callAddAppFilterUser = rpc.declare({
	object: 'appfilter',
	method: 'add_app_filter_user',
	params: ['mac_list']
});

const callDelAppFilterUser = rpc.declare({
	object: 'appfilter',
	method: 'del_app_filter_user',
	params: ['mac']
});

const callGetWhitelistUser = rpc.declare({
	object: 'appfilter',
	method: 'get_whitelist_user'
});

const callAddWhitelistUser = rpc.declare({
	object: 'appfilter',
	method: 'add_whitelist_user',
	params: ['mac_list']
});

const callDelWhitelistUser = rpc.declare({
	object: 'appfilter',
	method: 'del_whitelist_user',
	params: ['mac']
});

return L.view.extend({
	userData: { list: [], mode: 1 },
	whitelistData: { users: [] },
	allUsers: [],

	load() {
		if (!document.getElementById('oaf-css')) {
			const link = document.createElement('link');
			link.id = 'oaf-css';
			link.rel = 'stylesheet';
			link.href = L.resource('view/oaf/css/common.css');
			document.head.appendChild(link);
		}

		return Promise.all([
			callGetAllUsers(2, 0),
			callGetAppFilterUser(),
			callGetWhitelistUser()
		]);
	},

	render(responses) {
		const view = this;

		if (responses[0] && responses[0].data && Array.isArray(responses[0].data.list)) {
			view.allUsers = responses[0].data.list;
		}
		if (responses[1] && responses[1].data) {
			view.userData = responses[1].data;
			if (!Array.isArray(view.userData.list)) {
				view.userData.list = [];
			}
		}
		if (responses[2] && responses[2].data && Array.isArray(responses[2].data.list)) {
			view.whitelistData.users = responses[2].data.list;
		}

		const container = E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, _('User Configuration')),
			E('div', { 'class': 'cbi-map-descr' }, _('Configure application filtering user modes, managed terminals, and whitelists.')),
			
			E('div', { 'class': 'cbi-section cbi-tblsection' }, [
				E('div', { 'style': 'max-width: 1000px; padding: 10px;' }, [
					
					E('div', { 'class': 'mode-selection' }, [
						E('label', {}, [
							E('input', {
								'type': 'radio',
								'name': 'mode',
								'value': '0',
								'click': () => view.switchMode(0)
							}),
							E('span', {}, ' ' + _('Automatic Mode'))
						]),
						E('label', { 'style': 'margin-left: 20px;' }, [
							E('input', {
								'type': 'radio',
								'name': 'mode',
								'value': '1',
								'click': () => view.switchMode(1)
							}),
							E('span', {}, ' ' + _('Manual Mode'))
						])
					]),

					E('div', { 'id': 'modeDescription', 'class': 'desc', 'style': 'margin-bottom: 20px; font-weight: 500;' }),

					E('div', { 'id': 'manual_section', 'style': 'display: none; margin-bottom: 20px;' }, [
						E('h3', { 'style': 'margin-bottom: 10px;' }, _('Controlled Terminals')),
						E('table', { 'class': 'table cbi-section-table', 'id': 'user_table', 'style': 'width: 100%;' }, [
							E('tr', { 'class': 'tr table-titles' }, [
								E('th', { 'class': 'th' }, _('MAC Address')),
								E('th', { 'class': 'th' }, _('Hostname')),
								E('th', { 'class': 'th' }, _('Remark')),
								E('th', { 'class': 'th' }, _('Actions'))
							])
						])
					]),

					E('div', { 'id': 'auto_user_section', 'style': 'display: none; margin-bottom: 20px;' }, [
						E('h3', { 'style': 'margin-bottom: 10px;' }, _('Effective Users')),
						E('table', { 'class': 'table cbi-section-table', 'id': 'auto_user_table', 'style': 'width: 100%;' }, [
							E('tr', { 'class': 'tr table-titles' }, [
								E('th', { 'class': 'th' }, _('MAC Address')),
								E('th', { 'class': 'th' }, _('Hostname')),
								E('th', { 'class': 'th' }, _('Remark')),
								E('th', { 'class': 'th' }, _('Actions'))
							])
						]),
						E('div', { 'id': 'no_users_message', 'style': 'display: none; text-align: center; padding: 25px 0; color: #666;' }, [
							E('em', {}, _('No Users Available'))
						])
					]),

					E('div', { 'id': 'whitelist_section', 'style': 'display: none; margin-bottom: 20px;' }, [
						E('h3', { 'style': 'margin-bottom: 5px;' }, _('Whitelist Users')),
						E('p', { 'class': 'desc', 'style': 'margin-bottom: 10px;' }, _('Terminals in the whitelist are not filtered.')),
						E('table', { 'class': 'table cbi-section-table', 'id': 'whitelist_table', 'style': 'width: 100%;' }, [
							E('tr', { 'class': 'tr table-titles' }, [
								E('th', { 'class': 'th' }, _('MAC Address')),
								E('th', { 'class': 'th' }, _('Hostname')),
								E('th', { 'class': 'th' }, _('Remark')),
								E('th', { 'class': 'th' }, _('Actions'))
							])
						])
					]),

					E('div', { 'class': 'cbi-section-create', 'style': 'margin-top: 20px;' }, [
						E('button', {
							'type': 'button',
							'id': 'addButton',
							'class': 'cbi-button cbi-button-add',
							'click': () => view.showAddModal()
						}, _('Add User'))
					])
				])
			]),

			E('div', { 'id': 'deviceSelectModal', 'class': 'oaf-modal', 'style': 'display: none;' }, [
				E('div', { 'class': 'oaf-modal-content', 'style': 'width: 450px; height: 350px;' }, [
					E('button', {
						'type': 'button',
						'class': 'oaf-modal-close',
						'click': () => view.closeModal('deviceSelectModal')
					}, '×'),
					E('h4', { 'id': 'modalTitle', 'style': 'margin: 0 0 15px 0; color: #333; font-size: 18px;' }, _('Select Device')),
					E('div', { 'id': 'deviceListContainer', 'style': 'flex: 1; overflow-y: auto; border: 1px solid #eee; padding: 10px; border-radius: 4px;' }),
					E('div', { 'style': 'margin-top: 15px; display: flex; justify-content: flex-end; gap: 15px;' }, [
						E('button', {
							'type': 'button',
							'class': 'cbi-button cbi-button-neutral',
							'click': () => view.closeModal('deviceSelectModal')
						}, _('Cancel')),
						E('button', {
							'type': 'button',
							'class': 'cbi-button cbi-button-action',
							'click': () => view.submitSelectedDevices()
						}, _('OK'))
					])
				])
			])
		]);

		view.updateViewUI(container);
		return container;
	},

	updateViewUI(container) {
		const view = this;
		const mode = view.userData.mode;

		// set radio checked
		const radioMode0 = container.querySelector('input[name="mode"][value="0"]');
		const radioMode1 = container.querySelector('input[name="mode"][value="1"]');
		if (radioMode0) radioMode0.checked = (mode === 0);
		if (radioMode1) radioMode1.checked = (mode === 1);

		// update description
		const descElement = container.querySelector('#modeDescription');
		if (mode === 0) {
			descElement.textContent = _('In automatic mode, all newly joined terminals will be controlled, and random MAC addresses on mobile phones are also applicable.');
		} else {
			descElement.textContent = _('In manual mode, only specified terminals are controlled.');
		}

		const manualSection = container.querySelector('#manual_section');
		const autoSection = container.querySelector('#auto_user_section');
		const whitelistSection = container.querySelector('#whitelist_section');
		const addButton = container.querySelector('#addButton');

		if (mode === 1) {
			manualSection.style.display = 'block';
			autoSection.style.display = 'none';
			whitelistSection.style.display = 'none';
			addButton.textContent = _('Add User');
			view.renderManualUsersTable(container.querySelector('#user_table'));
		} else {
			manualSection.style.display = 'none';
			autoSection.style.display = 'block';
			whitelistSection.style.display = 'block';
			addButton.textContent = _('Add Whitelist User');
			view.renderAutoUsersTable(container.querySelector('#auto_user_table'), container.querySelector('#no_users_message'));
			view.renderWhitelistTable(container.querySelector('#whitelist_table'));
		}
	},

	renderManualUsersTable(table) {
		const view = this;
		if (!table) return;

		// clean table rows
		const rows = table.querySelectorAll('.tr:not(.table-titles)');
		rows.forEach(row => row.remove());

		const list = view.userData.list || [];
		list.forEach((user) => {
			const hostname = user.hostname || '--';
			const nickname = user.nickname || '--';
			
			const tr = table.insertRow(-1);
			tr.className = 'tr';

			const cellMac = tr.insertCell(-1);
			cellMac.className = 'td';
			cellMac.textContent = user.mac;

			const cellHostname = tr.insertCell(-1);
			cellHostname.className = 'td';
			cellHostname.textContent = hostname;

			const cellRemark = tr.insertCell(-1);
			cellRemark.className = 'td';
			cellRemark.textContent = nickname;

			const cellActions = tr.insertCell(-1);
			cellActions.className = 'td';

			const btnDel = E('button', {
				'type': 'button',
				'class': 'cbi-button cbi-button-reset',
				'click': () => view.removeManualUser(user.mac)
			}, _('Delete'));

			dom.append(cellActions, btnDel);
		});
	},

	renderAutoUsersTable(table, emptyMessage) {
		const view = this;
		if (!table) return;

		// clean table rows
		const rows = table.querySelectorAll('.tr:not(.table-titles)');
		rows.forEach(row => row.remove());

		// get non-whitelisted users
		const displayList = view.allUsers.filter(user => {
			return !view.whitelistData.users.some(w => w.mac === user.mac);
		});

		if (displayList.length === 0) {
			emptyMessage.style.display = 'block';
			table.style.display = 'none';
		} else {
			emptyMessage.style.display = 'none';
			table.style.display = 'table';

			displayList.forEach(user => {
				const hostname = user.hostname || '--';
				const nickname = user.nickname || '--';

				const tr = table.insertRow(-1);
				tr.className = 'tr';

				const cellMac = tr.insertCell(-1);
				cellMac.className = 'td';
				cellMac.textContent = user.mac;

				const cellHostname = tr.insertCell(-1);
				cellHostname.className = 'td';
				cellHostname.textContent = hostname;

				const cellRemark = tr.insertCell(-1);
				cellRemark.className = 'td';
				cellRemark.textContent = nickname;

				const cellActions = tr.insertCell(-1);
				cellActions.className = 'td';

				const btnAdd = E('button', {
					'type': 'button',
					'class': 'cbi-button cbi-button-action',
					'click': () => view.addToWhitelist(user.mac)
				}, _('Add to Whitelist'));

				dom.append(cellActions, btnAdd);
			});
		}
	},

	renderWhitelistTable(table) {
		const view = this;
		if (!table) return;

		// clean table rows
		const rows = table.querySelectorAll('.tr:not(.table-titles)');
		rows.forEach(row => row.remove());

		const list = view.whitelistData.users || [];
		list.forEach(user => {
			const hostname = user.hostname || '--';
			const nickname = user.nickname || '--';

			const tr = table.insertRow(-1);
			tr.className = 'tr';

			const cellMac = tr.insertCell(-1);
			cellMac.className = 'td';
			cellMac.textContent = user.mac;

			const cellHostname = tr.insertCell(-1);
			cellHostname.className = 'td';
			cellHostname.textContent = hostname;

			const cellRemark = tr.insertCell(-1);
			cellRemark.className = 'td';
			cellRemark.textContent = nickname;

			const cellActions = tr.insertCell(-1);
			cellActions.className = 'td';

			const btnDel = E('button', {
				'type': 'button',
				'class': 'cbi-button cbi-button-reset',
				'click': () => view.removeWhitelistUser(user.mac)
			}, _('Delete'));

			dom.append(cellActions, btnDel);
		});
	},

	switchMode(newMode) {
		const view = this;
		ui.showModal(null, E('p', { 'class': 'spinning' }, _('Switching mode...')));

		callSetAppFilterUser(newMode).then(() => {
			view.userData.mode = newMode;
			view.updateViewUI(document.body);
			ui.hideModal();
			ui.addNotification(null, E('p', {}, _('Mode switch successful.')), 'info');
		}).catch((err) => {
			ui.hideModal();
			ui.addNotification(null, E('p', {}, _('Failed to switch mode: ') + err.message), 'danger');
		});
	},

	removeManualUser(mac) {
		const view = this;
		ui.showModal(null, E('p', { 'class': 'spinning' }, _('Deleting user...')));

		callDelAppFilterUser(mac).then(() => {
			return callGetAppFilterUser();
		}).then((data) => {
			view.userData = data.data || { list: [], mode: 1 };
			view.updateViewUI(document.body);
			ui.hideModal();
			ui.addNotification(null, E('p', {}, _('Delete successful.')), 'info');
		}).catch((err) => {
			ui.hideModal();
			ui.addNotification(null, E('p', {}, _('Failed to delete user: ') + err.message), 'danger');
		});
	},

	addToWhitelist(mac) {
		const view = this;
		ui.showModal(null, E('p', { 'class': 'spinning' }, _('Adding to whitelist...')));

		callAddWhitelistUser([mac]).then(() => {
			return Promise.all([
				callGetWhitelistUser(),
				callGetAllUsers(2, 0)
			]);
		}).then((responses) => {
			if (responses[0] && responses[0].data && Array.isArray(responses[0].data.list)) {
				view.whitelistData.users = responses[0].data.list;
			}
			if (responses[1] && responses[1].data && Array.isArray(responses[1].data.list)) {
				view.allUsers = responses[1].data.list;
			}
			view.updateViewUI(document.body);
			ui.hideModal();
			ui.addNotification(null, E('p', {}, _('Add to whitelist successful.')), 'info');
		}).catch((err) => {
			ui.hideModal();
			ui.addNotification(null, E('p', {}, _('Failed to add whitelist: ') + err.message), 'danger');
		});
	},

	removeWhitelistUser(mac) {
		const view = this;
		ui.showModal(null, E('p', { 'class': 'spinning' }, _('Removing from whitelist...')));

		callDelWhitelistUser(mac).then(() => {
			return Promise.all([
				callGetWhitelistUser(),
				callGetAllUsers(2, 0)
			]);
		}).then((responses) => {
			if (responses[0] && responses[0].data && Array.isArray(responses[0].data.list)) {
				view.whitelistData.users = responses[0].data.list;
			}
			if (responses[1] && responses[1].data && Array.isArray(responses[1].data.list)) {
				view.allUsers = responses[1].data.list;
			}
			view.updateViewUI(document.body);
			ui.hideModal();
			ui.addNotification(null, E('p', {}, _('Remove from whitelist successful.')), 'info');
		}).catch((err) => {
			ui.hideModal();
			ui.addNotification(null, E('p', {}, _('Failed to remove from whitelist: ') + err.message), 'danger');
		});
	},

	showAddModal() {
		const view = this;
		const mode = view.userData.mode;

		const modal = document.getElementById('deviceSelectModal');
		const container = document.getElementById('deviceListContainer');
		const title = document.getElementById('modalTitle');

		title.textContent = mode === 1 ? _('Select Devices (Controlled)') : _('Select Devices (Whitelist)');
		container.innerHTML = '';
		modal.style.display = 'flex';

		// ignore active devices
		const activeList = mode === 1 ? view.userData.list : view.whitelistData.users;
		const displayList = view.allUsers.filter(user => {
			return !activeList.some(active => active.mac === user.mac);
		});

		if (displayList.length === 0) {
			container.innerHTML = `<div style="text-align: center; padding: 20px; color: #777;"><em>${_('No new devices available')}</em></div>`;
			return;
		}

		displayList.forEach(user => {
			const displayName = user.nickname || user.hostname || '';
			const row = E('div', { 'class': 'user-item', 'style': 'padding: 8px 0; border-bottom: 1px solid #f5f5f5;' }, [
				E('label', { 'style': 'display: flex; align-items: center; width: 100%; cursor: pointer;' }, [
					E('input', {
						'type': 'checkbox',
						'value': user.mac,
						'style': 'margin-right: 10px;'
					}),
					E('div', {}, [
						E('div', { 'style': 'font-weight: bold;' }, user.mac),
						displayName ? E('div', { 'style': 'font-size: 11px; color: #666;' }, displayName) : ''
					])
				])
			]);
			dom.append(container, row);
		});
	},

	submitSelectedDevices() {
		const view = this;
		const mode = view.userData.mode;

		const checkboxes = document.getElementById('deviceListContainer').querySelectorAll('input[type="checkbox"]:checked');
		const selectedMacs = Array.from(checkboxes).map(cb => cb.value);

		if (selectedMacs.length === 0) {
			view.closeModal('deviceSelectModal');
			return;
		}

		ui.showModal(null, E('p', { 'class': 'spinning' }, _('Adding selected devices...')));

		const promiseCall = mode === 1 ? callAddAppFilterUser(selectedMacs) : callAddWhitelistUser(selectedMacs);

		promiseCall.then(() => {
			const refreshPromises = mode === 1 ? [
				callGetAppFilterUser()
			] : [
				callGetWhitelistUser(),
				callGetAllUsers(2, 0)
			];
			return Promise.all(refreshPromises);
		}).then((responses) => {
			if (mode === 1) {
				if (responses[0] && responses[0].data) {
					view.userData = responses[0].data;
					if (!Array.isArray(view.userData.list)) {
						view.userData.list = [];
					}
				}
			} else {
				if (responses[0] && responses[0].data && Array.isArray(responses[0].data.list)) {
					view.whitelistData.users = responses[0].data.list;
				}
				if (responses[1] && responses[1].data && Array.isArray(responses[1].data.list)) {
					view.allUsers = responses[1].data.list;
				}
			}
			view.updateViewUI(document.body);
			view.closeModal('deviceSelectModal');
			ui.hideModal();
			ui.addNotification(null, E('p', {}, _('Add successful.')), 'info');
		}).catch((err) => {
			ui.hideModal();
			ui.addNotification(null, E('p', {}, _('Failed to add devices: ') + err.message), 'danger');
		});
	},

	closeModal(modalId) {
		const modal = document.getElementById(modalId);
		if (modal) {
			modal.style.display = 'none';
		}
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
