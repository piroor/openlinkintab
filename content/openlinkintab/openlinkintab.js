(function() {
var { inherit } = Components.utils.import('resource://openlinkintab-modules/inherit.jsm', {});
var { OpenLinkInTabConstants } = Components.utils.import('resource://openlinkintab-modules/constants.js', {});
var { OpenLinkInTabChromeUtils } = Components.utils.import('resource://openlinkintab-modules/chromeUtils.js', {});
var { autoNewTabHelper} = Components.utils.import('resource://openlinkintab-modules/autoNewTabHelper.js', {});

var OpenLinkInTabService = inherit(OpenLinkInTabConstants, { 
	utils : OpenLinkInTabChromeUtils,
	helper : autoNewTabHelper,
	
	preInit : function TSTService_preInit() 
	{
		if (this.preInitialized) return;
		this.preInitialized = true;

		window.removeEventListener('DOMContentLoaded', this, true);
		if (location.href.indexOf('chrome://browser/content/browser.xul') != 0)
			return;

		this.overrideExtensions(); // hacks.js
	},
	preInitialized : false,
 
	init : function OLITService_init() 
	{
		if (!('gBrowser' in window)) return;

		if (!this.preInitialized)
			this.preInit();

		if (this.initialized) return;
		this.initialized = true;

		window.removeEventListener('load', this, false);

		window.addEventListener('unload', this, false);
		window.addEventListener('TabRemotenessChange', this, true);

		window.messageManager.loadFrameScript(this.CONTENT_SCRIPT, true);

		this.initUninstallationListener();
	},
	initialized : false,
	
	initUninstallationListener : function OLITService_initUninstallationListener() 
	{
		var { prefs } = Components.utils.import('resource://openlinkintab-modules/prefs.js', {});
		var restorePrefs = function() {
				if (!prefs) return;
				[
					'browser.link.open_newwindow.restriction'
				].forEach(function(aPref) {
					var backup = prefs.getPref(aPref+'.backup');
					if (backup === null) return;
					prefs.setPref(aPref+'.override', backup); // we have to set to ".override" pref, to avoid unexpectedly reset by the preference listener.
					prefs.clearPref(aPref+'.backup');
				});
			};
		new window['piro.sakura.ne.jp'].UninstallationListener({
			id : 'openlinkintab@piro.sakura.ne.jp',
			onuninstalled : restorePrefs,
			ondisabled : restorePrefs
		});
	},
  
	destroy : function OLITService_destroy() 
	{
		if (!this.initialized) return;
		this.initialized = false;

		window.removeEventListener('unload', this, false);
		window.removeEventListener('TabRemotenessChange', this, true);

		window.messageManager.broadcastAsyncMessage(this.MESSAGE_TYPE, {
			command : this.COMMAND_SHUTDOWN
		});
		window.messageManager.removeDelayedFrameScript(this.CONTENT_SCRIPT);
	},

  
	handleEvent : function OLITService_handleEvent(aEvent) 
	{
		switch (aEvent.type)
		{
			case 'DOMContentLoaded':
				return this.preInit();

			case 'load':
				return this.init();

			case 'unload':
				return this.destroy();

			case 'TabRemotenessChange':
				return this.onTabRemotenessChange(aEvent);
		}
	},
	
 
	onTabRemotenessChange : function OLITService_onTabRemotenessChange(aEvent)
	{
		var tab = aEvent.originalTarget;
		tab.linkedBrowser.messageManager.sendAsyncMessage(this.MESSAGE_TYPE, {
			command : this.COMMAND_NOTIFY_REMOTENESS_UPDATED
		});
	}
 
}); 
  
window.addEventListener('DOMContentLoaded', OpenLinkInTabService, false);
window.addEventListener('load', OpenLinkInTabService, false);

window.OpenLinkInTabService = OpenLinkInTabService;
})();
 
