var OpenLinkInTabService = { 
	
	get browser() 
	{
		return 'SplitBrowser' in window ? window.SplitBrowser.activeBrowser :
			window.gBrowser ;
	},
 
	preInit : function TSTService_preInit() 
	{
		if (this.preInitialized) return;
		this.preInitialized = true;

		window.removeEventListener('DOMContentLoaded', this, true);
		if (location.href.indexOf('chrome://browser/content/browser.xul') != 0)
			return;

		this.overrideExtensionsPreInit(); // hacks.js
		this.overrideGlobalFunctionsPreInit();
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
		window.addEventListener('TabOpen', this, true);

		this.overrideExtensionsOnInitBefore(); // hacks.js
		this.overrideGlobalFunctions();
		this.overrideExtensionsOnInitAfter(); // hacks.js

		this.initUninstallationListener();

		this.utils.prefs.addPrefListener(this);
		this.onPrefChange(this.kPREFROOT + '.handleEventsBeforeWebPages.domains');
	},
	initialized : false,
	
	initUninstallationListener : function OLITService_initUninstallationListener() 
	{
		var namespace = {};
		Components.utils.import(
			'resource://openlinkintab-modules/prefs.js',
			namespace
		);
		var prefs = namespace.prefs;
		namespace = void(0);
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
		window.removeEventListener('TabOpen', this, true);

		this.utils.prefs.removePrefListener(this);

		if (this.isListeningClickEvent) {
			this.browser.removeEventListener('click', this, true);
			this.isListeningClickEvent = false;
		}
	},
 
	overrideGlobalFunctionsPreInit : function OLITService_overrideGlobalFunctionsPreInit() 
	{
		[
			'window.duplicateTab.handleLinkClick',
			'window.__openlinkintab__highlander__origHandleLinkClick',
			'window.__splitbrowser__handleLinkClick',
			'window.__ctxextensions__handleLinkClick',
			'window.handleLinkClick'
		].some(function(aFunc) {
			let source = this._getFunctionSource(aFunc);
			if (!source || !/^\(?function handleLinkClick/.test(source))
				return false;
			eval(aFunc+' = '+source.replace(
				'where = whereToOpenLink(event);',
				'$&\n' +
				'  var OLITFilteringResult = OpenLinkInTabService.utils.filterWhereToOpenLink(where, { linkNode : linkNode, event : event });\n' +
				'  where = OLITFilteringResult.where;\n' +
				'  if (OLITFilteringResult.divertedToTab)\n' +
				'    OpenLinkInTabService.utils.readyToOpenDivertedTab();\n'
			).replace(
				/(if \([^\)]*where == "current")/,
				'$1 && !OLITFilteringResult.inverted'
			));
			source = null;
			return true;
		}, this);
	},
 
	overrideGlobalFunctions : function OLITService_overrideGlobalFunctions() 
	{
		[
			'window.permaTabs.utils.wrappedFunctions["window.contentAreaClick"]',
			'window.__contentAreaClick',
			'window.__ctxextensions__contentAreaClick',
			'window.contentAreaClick'
		].forEach(function(aFunc) {
			let source = this._getFunctionSource(aFunc);
			if (!source || !/^\(?function contentAreaClick/.test(source))
				return;
			eval(aFunc+' = '+source.replace(
				/((openWebPanel\([^\;]+\);|PlacesUIUtils.showMinimalAddBookmarkUI\([^;]+\);)\s*event.preventDefault\(\);\s*return false;\s*\})/,
				'$1\n' +
				'else if (\n' +
				'  ( // do nothing for Tab Mix Plus\n' +
				'    !OpenLinkInTabService.utils.getMyPref("compatibility.TMP") ||\n' +
				'    !("TMP_contentAreaClick" in window)\n' +
				'  ) &&\n' +
				'  OpenLinkInTabService.utils.checkReadyToOpenNewTabFromLink(wrapper)\n' +
				'  ) {\n' +
				'  event.stopPropagation();\n' +
				'  event.preventDefault();\n' +
				'  handleLinkClick(event, wrapper.href, linkNode);\n' +
				'  return true;\n' +
				'}\n'
			));
			source = null;
		}, this);
	},
	
	_getFunctionSource : function OLITService_getFunctionSource(aFunc) 
	{
		var func;
		try {
			eval('func = '+aFunc);
		}
		catch(e) {
			return null;
		}
		return func ? func.toSource() : null ;
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

			case 'TabOpen':
				return this.onTabOpened(aEvent);

			case 'click':
				return this.onLinkClick(aEvent);
		}
	},
	
	onTabOpened : function OLITService_onTabOpened(aEvent) 
	{
		var tab = aEvent.originalTarget;
		var b   = this.helper.getTabBrowserFromChild(tab);
		if (b.__openlinkintab__readiedToOpenDivertedTab) {
			if (!this.utils.prefs.getPref('browser.tabs.loadDivertedInBackground')) {
				window.setTimeout(function() {
					if (b.selectedTab == tab)
						return;

					var owner = b.selectedTab;
					b.selectedTab = tab;
					tab.owner = owner;
				}, 0);
			}
			b.__openlinkintab__readiedToOpenDivertedTab = false;
		}
	},
 
	onLinkClick : function OLITUtils_onLinkClick(aEvent) 
	{
		var handler = aEvent.currentTarget.getAttribute('onclick');
		var domain = aEvent.originalTarget.ownerDocument.defaultView.location.hostname;
		if (handler &&
			this.handleClickEventDomainMatcher && domain &&
			this.handleClickEventDomainMatcher.test(domain)) {
			handler = new Function(
				'event',
				'var result = (function() { ' +
				handler +
				' }).call(this);' +
				'return result;'
			);
			let result = handler.call(this.browser, aEvent);
			if (aEvent.defaultPrevented && aEvent.stopImmediatePropagation)
				aEvent.stopImmediatePropagation();
			return result;
		}
	},
  
	/* Pref Listener */ 
	domains : [ 
		'extensions.openlinkintab@piro.sakura.ne.jp.'
	],
	onPrefChange : function OLITUtils_onPrefChange(aPrefName) 
	{
		var value = this.utils.prefs.getPref(aPrefName);
		switch (aPrefName.replace(this.kPREFROOT + '.', ''))
		{
			case 'handleEventsBeforeWebPages.domains':
				value = (value || '').replace(/\./g, '\\.')
							.replace(/\*/g, '.*')
							.replace(/\?/g, '.')
							.replace(/^[\s,\|]+|[\s,\|]+$/g, '')
							.replace(/[\s,\|]+/g, '|');
				try {
					this.handleClickEventDomainMatcher = new RegExp(value, 'i');
				}
				catch(e) {
					this.handleClickEventDomainMatcher = null;
				}
			case 'openOuterLinkInNewTab':
			case 'openAnyLinkInNewTab':
			case 'handleEventsBeforeWebPages':
				let requireListen = this.handleClickEventDomainMatcher &&
						(
							this.utils.prefs.getPref(this.kPREFROOT + '.openOuterLinkInNewTab') ||
							this.utils.prefs.getPref(this.kPREFROOT + '.openAnyLinkInNewTab')
						) &&
						this.utils.prefs.getPref(this.kPREFROOT + '.handleEventsBeforeWebPages');
				if (requireListen && !this.isListeningClickEvent) {
					this.browser.addEventListener('click', this, true);
					this.isListeningClickEvent = true;
				}
				else if (!requireListen && this.isListeningClickEvent) {
					this.browser.removeEventListener('click', this, true);
					this.isListeningClickEvent = false;
				}
				break;

			default:
				break;
		}
	}
 
}; 
  
(function() { 
	var namespace = {};
	Components.utils.import('resource://openlinkintab-modules/utils.js', namespace);
	Components.utils.import('resource://openlinkintab-modules/autoNewTabHelper.js', namespace);
	OpenLinkInTabService.utils = namespace.OpenLinkInTabUtils;
	OpenLinkInTabService.helper = namespace.autoNewTabHelper;

	window.addEventListener('DOMContentLoaded', OpenLinkInTabService, false);
	window.addEventListener('load', OpenLinkInTabService, false);
})();
 
