'use strict';
'require rpc';
'require ui';
'require dom';
'require poll';

const callGetAllUsers = rpc.declare({
	object: 'appfilter',
	method: 'get_all_users',
	params: ['flag', 'page']
});

const callGetDevVisitTime = rpc.declare({
	object: 'appfilter',
	method: 'dev_visit_time',
	params: ['mac']
});

const callGetDevVisitList = rpc.declare({
	object: 'appfilter',
	method: 'dev_visit_list',
	params: ['mac']
});

const callSetNickname = rpc.declare({
	object: 'appfilter',
	method: 'set_nickname',
	params: ['mac', 'nickname']
});

return L.view.extend({
	userListData: { list: [] },
	currentMac: null,
	echartsInstance: null,

	load() {
		// dynamic load css
		if (!document.getElementById('oaf-css')) {
			const link = document.createElement('link');
			link.id = 'oaf-css';
			link.rel = 'stylesheet';
			link.href = L.resource('view/oaf/css/common.css');
			document.head.appendChild(link);
		}

		// dynamic load echarts
		return new Promise((resolve) => {
			if (window.echarts) {
				resolve();
				return;
			}
			const script = document.createElement('script');
			script.src = L.resource('view/oaf/js/echarts.min.js');
			script.onload = () => resolve();
			script.onerror = () => resolve();
			document.head.appendChild(script);
		});
	},

	render() {
		const view = this;

		const container = E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, _('User List')),
			E('div', { 'class': 'cbi-map-descr' }, _('View online devices, application statistics, and manage user remarks.')),
			E('div', { 'style': 'max-height: 750px; overflow-y: auto; padding-right: 20px;' }, [
				E('div', { 'class': 'cbi-section cbi-tblsection' }, [
					E('table', { 'class': 'table cbi-section-table', 'id': 'user_status_table', 'style': 'table-layout: fixed; width: 100%;' }, [
						E('tr', { 'class': 'tr table-titles' }, [
							E('th', { 'class': 'th', 'style': 'width: 25%;' }, _('Device Info')),
							E('th', { 'class': 'th', 'style': 'width: 15%;' }, _('IP Address')),
							E('th', { 'class': 'th', 'style': 'width: 20%;' }, _('Common App(TOP5)')),
							E('th', { 'class': 'th', 'style': 'width: 15%;' }, _('Active App')),
							E('th', { 'class': 'th', 'style': 'width: 25%;' }, _('Current URL')),
							E('th', { 'class': 'th', 'style': 'width: 15%;' }, _('Online Status')),
							E('th', { 'class': 'th', 'style': 'width: 20%;' }, _('Actions'))
						]),
						E('tr', { 'class': 'tr', 'id': 'loading_row' }, [
							E('td', { 'class': 'td', 'colspan': '7' }, [
								E('em', {}, _('Collecting data...'))
							])
						])
					])
				])
			]),

			E('div', { 'id': 'detailsModal', 'class': 'oaf-modal', 'style': 'display: none;' }, [
				E('div', { 'class': 'oaf-modal-content', 'style': 'width: 800px; height: 550px;' }, [
					E('button', {
						'type': 'button',
						'class': 'oaf-modal-close',
						'click': () => view.closeModal('detailsModal')
					}, '×'),
					E('h4', { 'class': 'oaf-modal-title', 'style': 'margin: 0 0 20px 0; font-size: 18px;' }, [
						_('Device Details'),
						E('span', { 'id': 'deviceInfo', 'class': 'oaf-modal-subtitle', 'style': 'font-size: 14px; font-weight: normal; margin-left: 10px; opacity: 0.8;' })
					]),
					E('ul', { 'class': 'tab-list' }, [
						E('li', {
							'class': 'tab-item active',
							'click': (ev) => view.switchTab('tab2', ev.target)
						}, _('App Statistics')),
						E('li', {
							'class': 'tab-item',
							'click': (ev) => view.switchTab('tab3', ev.target)
						}, _('Access Records'))
					]),
					E('div', { 'id': 'tab2', 'class': 'tab-body active' }, [
						E('div', { 'class': 'pie-chart', 'style': 'width: 100%;' }, [
							E('div', { 'id': 'app_time_chart', 'style': 'width: 100%; height: 350px;' })
						])
					]),
					E('div', { 'id': 'tab3', 'class': 'tab-body' }, [
						E('div', { 'style': 'max-height: 350px; overflow-y: auto; padding-right: 10px;' }, [
							E('table', { 'class': 'table cbi-section-table', 'id': 'visit_list_table' }, [
								E('tr', { 'class': 'tr table-titles' }, [
									E('th', { 'class': 'th' }, _('App Name')),
									E('th', { 'class': 'th' }, _('Start Time')),
									E('th', { 'class': 'th' }, _('Last Time')),
									E('th', { 'class': 'th' }, _('Duration')),
									E('th', { 'class': 'th' }, _('Filter Status'))
								]),
								E('tr', { 'class': 'tr', 'id': 'records_loading_row' }, [
									E('td', { 'class': 'td', 'colspan': '5' }, [
										E('em', {}, _('Collecting data...'))
									])
								])
							])
						])
					])
				])
			]),

			E('div', { 'id': 'nicknameModal', 'class': 'oaf-modal', 'style': 'display: none;' }, [
				E('div', { 'class': 'oaf-modal-content', 'style': 'width: 450px;' }, [
					E('button', {
						'type': 'button',
						'class': 'oaf-modal-close',
						'click': () => view.closeModal('nicknameModal')
					}, '×'),
					E('h4', { 'class': 'oaf-modal-title', 'style': 'margin: 0 0 20px 0; font-size: 18px;' }, _('Modify Remark')),
					E('div', { 'style': 'margin-bottom: 20px;' }, [
						E('p', { 'style': 'margin: 0 0 8px 0; font-size: 14px; opacity: 0.8;' }, [
							E('span', { 'class': 'field-label', 'style': 'font-weight: bold; width: 100px; display: inline-block;' }, _('MAC Address') + ': '),
							E('span', { 'id': 'nicknameMacDisplay', 'style': 'font-weight: 500;' }, '--')
						])
					]),
					E('div', { 'style': 'margin-bottom: 30px;' }, [
						E('p', { 'style': 'margin: 0 0 8px 0; font-size: 14px; opacity: 0.8;' }, [
							E('span', { 'class': 'field-label', 'style': 'font-weight: bold;' }, _('Remark') + ':')
						]),
						E('input', {
							'type': 'text',
							'id': 'nicknameInput',
							'class': 'cbi-input-text',
							'style': 'padding: 10px; border-radius: 4px; width: 100%; font-size: 14px;',
							'placeholder': _('Enter nickname or remark')
						})
					]),
					E('div', { 'style': 'display: flex; justify-content: flex-end; gap: 15px;' }, [
						E('button', {
							'type': 'button',
							'class': 'cbi-button cbi-button-neutral',
							'click': () => view.closeModal('nicknameModal')
						}, _('Cancel')),
						E('button', {
							'type': 'button',
							'class': 'cbi-button cbi-button-action',
							'click': () => view.submitNicknameChange()
						}, _('OK'))
					])
				])
			])
		]);

		// poll users data
		poll.add(() => {
			return callGetAllUsers(3, 0).then((data) => {
				if (data && data.data) {
					view.userListData = data.data;
					view.updateUserList(data.data);
				}
			});
		}, 3);

		callGetAllUsers(3, 0).then((data) => {
			if (data && data.data) {
				view.userListData = data.data;
				view.updateUserList(data.data);
			}
		});

		return container;
	},

	updateUserList(data) {
		const tb = document.getElementById('user_status_table');
		if (!tb) return;

		// clear table rows
		while (tb.rows.length > 1) {
			tb.deleteRow(1);
		}

		const userList = data.list || [];
		if (userList.length === 0) {
			const tr = tb.insertRow(-1);
			const td = tr.insertCell(-1);
			td.colSpan = 7;
			td.className = 'td text-center';
			td.innerHTML = `<em>${_('No online devices found')}</em>`;
			return;
		}

		userList.forEach(user => {
			const nickname = user.nickname || "";
			const hostname = user.hostname || "";
			const displayName = nickname || hostname || "--";

			const tr = tb.insertRow(-1);
			tr.className = 'tr';
			if (user.online != 1) {
				tr.style.color = '#A9A9A9';
			}

			const cellDev = tr.insertCell(-1);
			cellDev.className = 'td';
			cellDev.innerHTML = `
				<div style="display: flex; align-items: center;">
					<div>
						<div style="font-weight: bold;">${displayName}</div>
						<div style="font-size: 11px; color: #666;">${user.mac}</div>
					</div>
				</div>
			`;

			const cellIp = tr.insertCell(-1);
			cellIp.className = 'td';
			cellIp.textContent = user.ip || '--';

			const cellApps = tr.insertCell(-1);
			cellApps.className = 'td';
			const applist = Array.isArray(user.applist) ? user.applist : [];
			if (applist.length === 0) {
				cellApps.textContent = '--';
			} else {
				const appListHtml = applist.map(app => {
					const iconSrc = app.icon === 0 ? L.resource('app_icons/default.png') : L.resource(`app_icons/${app.id}.png`);
					return `<img src="${iconSrc}" alt="${app.name}" title="${app.name}" style="width: 20px; height: 20px; border-radius: 4px; margin-right: 6px; vertical-align: middle;">`;
				}).join('');
				cellApps.innerHTML = appListHtml;
			}

			const cellActiveApp = tr.insertCell(-1);
			cellActiveApp.className = 'td';
			cellActiveApp.textContent = user.app || '--';

			const cellUrl = tr.insertCell(-1);
			cellUrl.className = 'td';
			const currentUrl = user.url || '--';
			let displayUrl = currentUrl;
			if (currentUrl !== '--' && currentUrl.length > 25) {
				displayUrl = currentUrl.substring(0, 12) + '...' + currentUrl.substring(currentUrl.length - 12);
			}
			cellUrl.innerHTML = `<span title="${currentUrl}">${displayUrl}</span>`;

			const cellOnline = tr.insertCell(-1);
			cellOnline.className = 'td';
			if (user.online == 1) {
				cellOnline.innerHTML = `<span style="color: green; font-weight: bold;">${_('Online')}</span>`;
			} else {
				cellOnline.textContent = _('Offline');
			}

			const cellActions = tr.insertCell(-1);
			cellActions.className = 'td';

			const mac = user.mac;

			const btnDetails = E('button', {
				'type': 'button',
				'class': 'cbi-button cbi-button-action',
				'style': 'margin-right: 5px;',
				'click': () => this.showDetails(mac)
			}, _('Details'));

			const btnRemark = E('button', {
				'type': 'button',
				'class': 'cbi-button cbi-button-neutral',
				'click': () => this.showModifyNickname(mac)
			}, _('Remark'));

			dom.append(cellActions, [btnDetails, btnRemark]);
		});
	},

	showDetails(mac) {
		const view = this;
		view.currentMac = mac;

		const modal = document.getElementById('detailsModal');
		modal.style.display = 'flex';
		view.updateDeviceInfoTitle(mac);

		const firstTabItem = modal.querySelector('.tab-item');
		if (firstTabItem) {
			view.switchTab('tab2', firstTabItem);
		}

		// get visit time data
		callGetDevVisitTime(mac).then((data) => {
			view.displayAppVisitView((data && data.list) ? data.list : []);
		});

		const tb = document.getElementById('visit_list_table');
		if (tb) {
			while (tb.rows.length > 1) {
				tb.deleteRow(1);
			}
			const tr = tb.insertRow(-1);
			const td = tr.insertCell(-1);
			td.colSpan = 5;
			td.className = 'td text-center';
			td.innerHTML = `<em>${_('Collecting data...')}</em>`;
		}

		callGetDevVisitList(mac).then((data) => {
			view.renderVisitListTable(data || { list: [] });
		});
	},

	updateDeviceInfoTitle(mac) {
		let deviceInfo = `(${mac})`;
		if (this.userListData && this.userListData.list) {
			const device = this.userListData.list.find(user => user.mac === mac);
			if (device) {
				const name = device.nickname || device.hostname || "";
				if (name) {
					deviceInfo = `${name} (${mac})`;
				}
			}
		}
		document.getElementById('deviceInfo').textContent = deviceInfo;
	},

	showModifyNickname(mac) {
		const view = this;
		view.currentMac = mac;

		const modal = document.getElementById('nicknameModal');
		modal.style.display = 'flex';

		document.getElementById('nicknameMacDisplay').textContent = mac;
		
		let currentNickname = '';
		if (view.userListData && view.userListData.list) {
			const device = view.userListData.list.find(user => user.mac === mac);
			if (device) {
				currentNickname = device.nickname || '';
			}
		}
		document.getElementById('nicknameInput').value = currentNickname;
	},

	validateNickname(nickname) {
		const invalidChars = /[\s'"]/;
		return !invalidChars.test(nickname) && nickname.length <= 32;
	},

	submitNicknameChange() {
		const view = this;
		const mac = view.currentMac;
		const nickname = document.getElementById('nicknameInput').value.trim();

		if (nickname !== '' && !view.validateNickname(nickname)) {
			ui.addNotification(null, E('p', {}, _('Please enter a valid remark (no spaces, quotes, and max 32 characters).')), 'danger');
			return;
		}

		callSetNickname(mac, nickname).then(() => {
			view.closeModal('nicknameModal');
			ui.addNotification(null, E('p', {}, _('Settings saved successfully.')), 'info');
			callGetAllUsers(3, 0).then((data) => {
				if (data && data.data) {
					view.userListData = data.data;
					view.updateUserList(data.data);
				}
			});
		}).catch((err) => {
			ui.addNotification(null, E('p', {}, _('Failed to update remark: ') + err.message), 'danger');
		});
	},

	closeModal(modalId) {
		const modal = document.getElementById(modalId);
		if (modal) {
			modal.style.display = 'none';
		}
	},

	switchTab(tabId, tabItem) {
		const modal = document.getElementById('detailsModal');
		const tabBodies = modal.querySelectorAll('.tab-body');
		const tabItems = modal.querySelectorAll('.tab-item');

		tabBodies.forEach(tab => tab.classList.remove('active'));
		tabItems.forEach(item => item.classList.remove('active'));

		document.getElementById(tabId).classList.add('active');
		tabItem.classList.add('active');

		// resize chart if tab2
		if (tabId === 'tab2' && this.echartsInstance) {
			setTimeout(() => {
				this.echartsInstance.resize();
			}, 100);
		}
	},

	getDisplayTime(total_time) {
		const hour = Math.floor(total_time / 3600);
		const seconds = total_time % 3600;
		let min = Math.floor(seconds / 60);
		const seconds2 = seconds % 60;
		
		if (hour > 0) {
			return `${hour}${_('h')}${min}${_('m')}`;
		} else {
			if (min === 0 && seconds2 !== 0) {
				min = 1;
			}
			return `${min}${_('m')}`;
		}
	},

	renderVisitListTable(data) {
		const tb = document.getElementById('visit_list_table');
		if (!tb) return;

		while (tb.rows.length > 1) {
			tb.deleteRow(1);
		}

		const visitList = data.list || [];
		if (visitList.length === 0) {
			const tr = tb.insertRow(-1);
			const td = tr.insertCell(-1);
			td.colSpan = 5;
			td.className = 'td text-center';
			td.innerHTML = `<em>${_('No access records found')}</em>`;
			return;
		}

		visitList.forEach(visit => {
			const filterStatus = visit.act == 1 ? 
				`<span style="color: red; font-weight: bold;">${_('Filtered')}</span>` : 
				`<span style="color: green; font-weight: bold;">${_('Unfiltered')}</span>`;

			const tr = tb.insertRow(-1);
			tr.className = 'tr';

			const iconSrc = visit.icon === 0 ? L.resource('app_icons/default.png') : L.resource(`app_icons/${visit.id}.png`);
			
			const cellApp = tr.insertCell(-1);
			cellApp.className = 'td';
			cellApp.innerHTML = `
				<div style="height: 24px; display: flex; align-items: center;">
					<img src="${iconSrc}" alt="${visit.name}" title="${visit.name}" style="width: 20px; height: 20px; border-radius: 4px; margin-right: 8px; vertical-align: middle;">
					<span>${visit.name}</span>
				</div>
			`;

			const cellStart = tr.insertCell(-1);
			cellStart.className = 'td';
			cellStart.textContent = new Date(visit.ft * 1000).toLocaleString();

			const cellLast = tr.insertCell(-1);
			cellLast.className = 'td';
			cellLast.textContent = new Date(visit.lt * 1000).toLocaleString();

			const cellDuration = tr.insertCell(-1);
			cellDuration.className = 'td';
			if (visit.act == 1) {
				cellDuration.textContent = '-';
			} else {
				cellDuration.textContent = this.getDisplayTime(visit.tt);
			}

			const cellFilter = tr.insertCell(-1);
			cellFilter.className = 'td';
			cellFilter.innerHTML = filterStatus;
		});
	},

	displayAppVisitView(data) {
		const view = this;
		const chartElement = document.getElementById('app_time_chart');
		if (!chartElement) {
			console.error("Chart element not found");
			return;
		}

		if (view.echartsInstance) {
			view.echartsInstance.dispose();
		}

		view.echartsInstance = echarts.init(chartElement);
		if (!data || data.length === 0) {
			view.echartsInstance.setOption({
				title: {
					text: _('App Time Statistics'),
					left: 'center',
					top: 'center',
					textStyle: {
						color: '#999',
						fontSize: 14,
						fontWeight: 'normal'
					}
				}
			});
			return;
		}

		let totalTime = 0;
		const appStatArray = [];

		data.forEach(item => {
			const t = item.t;
			const name = item.name;
			const displayTime = view.getDisplayTime(t);
			totalTime += t;

			appStatArray.push({
				value: t,
				legendname: name,
				name: `${name}  ${displayTime}`
			});
		});

		const total_time_str = view.getDisplayTime(totalTime);
		const option = {
			title: [
				{
					text: _("App Time Statistics"),
					textStyle: {
						fontSize: 16
					},
					left: "2%"
				},
				{
					text: '',
					subtext: total_time_str,
					textStyle: {
						fontSize: 15
					},
					subtextStyle: {
						fontSize: 15
					},
					textAlign: "center",
					x: '34.5%',
					y: '44%',
				}
			],
			tooltip: {
				trigger: 'item',
				formatter(parms) {
					const timeStr = view.getDisplayTime(parms.data.value);
					return `${parms.seriesName}<br/>` +
						`${parms.marker} ${parms.data.legendname}<br/>` +
						`${_("Visit Time")}: ${timeStr}<br/>` +
						`${_("Percentage")}: ${parms.percent}%`;
				}
			},
			legend: {
				type: "scroll",
				orient: 'vertical',
				left: '75%',
				align: 'left',
				top: 'middle',
				textStyle: {
					color: '#8C8C8C'
				},
				height: 250
			},
			series: [
				{
					name: _("Visit Time"),
					type: 'pie',
					radius: ['58%', '70%'],
					center: ['35%', '50%'], 
					clockwise: false,
					avoidLabelOverlap: true,
					itemStyle: {
						borderRadius: 1,
						borderColor: "#fff",
						borderWidth: 1,
					},
					label: {
						show: true,
						position: 'outside',
						formatter(parms) {
							return parms.data.legendname;
						}
					},
					labelLine: {
						show: true,
						length: 8,
						length2: 7,
						smooth: true,
					},
					data: appStatArray
				}
			]
		};

		view.echartsInstance.setOption(option);
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
