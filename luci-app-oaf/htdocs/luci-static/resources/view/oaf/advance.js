'use strict';
'require rpc';
'require ui';
'require dom';

const callGetAppFilterAdv = rpc.declare({
	object: 'appfilter',
	method: 'get_app_filter_adv'
});

const callSetAppFilterAdv = rpc.declare({
	object: 'appfilter',
	method: 'set_app_filter_adv',
	params: ['tcp_rst', 'lan_ifname', 'disable_hnat', 'auto_load_engine']
});

const callGetOafStatus = rpc.declare({
	object: 'appfilter',
	method: 'get_oaf_status'
});

return L.view.extend({
	advData: {},
	statusData: {},

	load() {
		if (!document.getElementById('oaf-css')) {
			const link = document.createElement('link');
			link.id = 'oaf-css';
			link.rel = 'stylesheet';
			link.href = L.resource('view/oaf/css/common.css');
			document.head.appendChild(link);
		}

		return Promise.all([
			callGetAppFilterAdv(),
			callGetOafStatus()
		]).then((responses) => {
			return {
				adv: responses[0] ? (responses[0].data || {}) : {},
				status: responses[1] ? (responses[1].data || {}) : {}
			};
		});
	},

	render(data) {
		const view = this;
		view.advData = data.adv;
		view.statusData = data.status;

		const container = E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, _('Advanced Settings')),
			E('div', { 'class': 'cbi-map-descr' }, _('Configure driver autoloading, network acceleration bypass, and custom LAN interfaces.')),
			
			E('div', { 'class': 'cbi-section cbi-tblsection' }, [
				E('div', { 'style': 'max-width: 1000px; padding: 10px;' }, [
					
					// version info
					E('div', { 'class': 'cbi-value', 'style': 'margin-bottom: 15px;' }, [
						E('label', { 'class': 'cbi-value-title', 'style': 'font-weight: bold; width: 220px;' }, _('OAF Version') + ':'),
						E('div', { 'class': 'cbi-value-field', 'style': 'padding: 0;' }, view.statusData.version || '--')
					]),
					E('div', { 'class': 'cbi-value', 'style': 'margin-bottom: 25px;' }, [
						E('label', { 'class': 'cbi-value-title', 'style': 'font-weight: bold; width: 220px;' }, _('OAF Driver Version') + ':'),
						E('div', { 'class': 'cbi-value-field', 'style': 'padding: 0;' }, view.statusData.engine_version || '--')
					]),

					// disable hnat
					E('div', { 'class': 'cbi-value', 'style': 'margin-bottom: 10px; display: flex; align-items: center;' }, [
						E('label', { 'for': 'disableHnatSwitch', 'style': 'font-weight: bold; width: 220px; display: inline-block;' }, _('Disable Software/Hardware Acceleration') + ':'),
						E('label', { 'class': 'switch' }, [
							E('input', {
								'type': 'checkbox',
								'id': 'disableHnatSwitch',
								'name': 'disableHnatSwitch'
							}),
							E('span', { 'class': 'slider' })
						])
					]),
					E('p', { 'class': 'desc', 'style': 'margin-bottom: 25px; color: gray;' }, _('Software and hardware acceleration, NAT offload and other modules may affect filtering or statistics functions. This interface only attempts to turn them off, but may not be completely successful. Please check the status in the firewall or network acceleration menu. Re-enabling acceleration requires a device restart to take effect.')),

					// auto load driver
					E('div', { 'class': 'cbi-value', 'style': 'margin-bottom: 10px; display: flex; align-items: center;' }, [
						E('label', { 'for': 'autoLoadEngineSwitch', 'style': 'font-weight: bold; width: 220px; display: inline-block;' }, _('Auto-load oaf driver') + ':'),
						E('label', { 'class': 'switch' }, [
							E('input', {
								'type': 'checkbox',
								'id': 'autoLoadEngineSwitch',
								'name': 'autoLoadEngineSwitch'
							}),
							E('span', { 'class': 'slider' })
						])
					]),
					E('p', { 'class': 'desc', 'style': 'margin-bottom: 25px; color: gray;' }, _('If the oaf driver cannot be manually unloaded or the current driver is unstable, you can turn off auto-loading at startup and manually install a suitable driver. It is recommended to use the official stable OpenWrt firmware.')),

					// lan port
					E('div', { 'class': 'cbi-value', 'style': 'margin-bottom: 10px; display: flex; align-items: center;' }, [
						E('label', { 'for': 'lan_ifname', 'style': 'font-weight: bold; width: 220px; display: inline-block;' }, _('LAN Interface') + ':'),
						E('input', {
							'type': 'text',
							'id': 'lan_ifname',
							'name': 'lan_ifname',
							'value': view.advData.lan_ifname || 'br-lan',
							'style': 'padding: 5px; width: 200px; border: 1px solid #ccc; border-radius: 4px;'
						})
					]),
					E('p', { 'class': 'desc', 'style': 'margin-bottom: 30px; color: gray;' }, _('The name of the LAN interface, used for detecting terminal information. The system default is bridge interface (br-lan). If the LAN port has been modified to a physical interface, please modify it to the corresponding name, such as eth0, support fuzzy matching. For example, you can setup lan to match br-lan and br-lan2.')),

					E('div', { 'class': 'button-container', 'style': 'border-top: 1px solid #eee; padding-top: 20px;' }, [
						E('button', {
							'type': 'button',
							'class': 'cbi-button cbi-button-save',
							'click': () => view.submitHandle()
						}, _('Save'))
					])
				])
			])
		]);

		// init checkbox value
		const disableHnatSwitch = container.querySelector('#disableHnatSwitch');
		if (disableHnatSwitch) {
			disableHnatSwitch.checked = (view.advData.disable_hnat == 1);
		}

		const autoLoadEngineSwitch = container.querySelector('#autoLoadEngineSwitch');
		if (autoLoadEngineSwitch) {
			autoLoadEngineSwitch.checked = (view.advData.auto_load_engine == 1);
		}

		return container;
	},

	validateLanIfname(name) {
		const regex = /^[a-zA-Z0-9.-]{2,16}$/;
		return regex.test(name);
	},

	submitHandle() {
		const view = this;
		const lanIfname = document.getElementById('lan_ifname').value.trim();
		const disableHnat = document.getElementById('disableHnatSwitch').checked ? 1 : 0;
		const autoLoadEngine = document.getElementById('autoLoadEngineSwitch').checked ? 1 : 0;
		const tcpRst = view.advData.tcp_rst || 0;

		if (!view.validateLanIfname(lanIfname)) {
			ui.addNotification(null, E('p', {}, _('Invalid LAN interface name. Please ensure it is 2-16 characters long and contains only letters, numbers, dots, and hyphens.')), 'danger');
			return;
		}

		ui.showModal(null, E('p', { 'class': 'spinning' }, _('Saving configuration...')));

		callSetAppFilterAdv(tcpRst, lanIfname, disableHnat, autoLoadEngine).then(() => {
			ui.hideModal();
			ui.addNotification(null, E('p', {}, _('Settings saved successfully.')), 'info');
			
			// reload status data
			return callGetAppFilterAdv().then((res) => {
				view.advData = res ? (res.data || {}) : {};
			});
		}).catch((err) => {
			ui.hideModal();
			ui.addNotification(null, E('p', {}, _('Failed to save settings: ') + err.message), 'danger');
		});
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
