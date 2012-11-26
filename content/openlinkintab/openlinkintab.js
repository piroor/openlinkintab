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
	},
 
	overrideGlobalFunctions : function OLITService_overrideGlobalFunctions() 
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
			eval(aFunc+' = '+source.replace(  // for -Firefox 3.6
				/(event.ctrlKey|event.metaKey)/,
				'OpenLinkInTabService.checkReadyToOpenNewTabFromLink({\n' +
				'  link     : (linkNode || { href : href }),\n' +
				'  modifier : $1,\n' +
				'  invert   : OpenLinkInTabService.getMyPref("link.invertDefaultBehavior")\n' +
				'}) &&\n' +
				'(\n' +
				'  (OpenLinkInTabService.isNewTabAction(event) ? null : OpenLinkInTabService.readyToOpenDivertedTab()),\n' +
				'  true\n' +
				')\n'
			).replace( // for -Firefox 3.6
				/* あらゆるリンクからタブを開く設定の時に、アクセルキーが押されていた場合は
				   反転された動作（通常のリンク読み込み）を行う */
				/return\s+false;\s*case\s+1:/,
				'  if ( // do nothing for Tab Mix Plus\n' +
				'    !OpenLinkInTabService.getMyPref("compatibility.TMP") ||\n' +
				'    !("TMP_contentAreaClick" in window)\n' +
				'    ) {\n' +
				'    if ("TreeStyleTabService" in window &&\n' +
				'      TreeStyleTabService.checkToOpenChildTab())\n' +
				'      TreeStyleTabService.stopToOpenChildTab();\n' +
				'    if (OpenLinkInTabService.isAccelKeyPressed(event)) {\n' +
				'      if (linkNode)\n' +
				'        urlSecurityCheck(href,\n' +
				'          "nodePrincipal" in linkNode.ownerDocument ?\n' +
				'            linkNode.ownerDocument.nodePrincipal :\n' +
				'            linkNode.ownerDocument.location.href\n' +
				'        );\n' +
				'      var postData = {};\n' +
				'      href = getShortcutOrURI(href, postData);\n' +
				'      if (!href) return false;\n' +
				'      loadURI(href, null, postData.value, false);\n' +
				'    }\n' +
				'  }\n' +
				'  return false;\n' +
				'case 1:\n'
			).replace( // for Firefox 4.0-
				'where = whereToOpenLink(event);',
				'$&\n' +
				'  var OLITFilteringResult = OpenLinkInTabService.filterWhereToOpenLink(where, { linkNode : linkNode, event : event });\n' +
				'  where = OLITFilteringResult.where;\n' +
				'  if (OLITFilteringResult.divertedToTab)\n' +
				'    OpenLinkInTabService.readyToOpenDivertedTab();\n'
			).replace( // for Firefox 4.0-
				/(if \([^\)]*where == "current")/,
				'$1 && !OLITFilteringResult.inverted'
			));
			source = null;
			return true;
		}, this);

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
				'    !OpenLinkInTabService.getMyPref("compatibility.TMP") ||\n' +
				'    !("TMP_contentAreaClick" in window)\n' +
				'  ) &&\n' +
				'  OpenLinkInTabService.checkReadyToOpenNewTabFromLink(wrapper)\n' +
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
		}
	},
	
	onTabOpened : function OLITService_onTabOpened(aEvent) 
	{
		var tab = aEvent.originalTarget;
		var b   = this.helper.getTabBrowserFromChild(tab);
		if (b.__openlinkintab__readiedToOpenDivertedTab) {
			if (!this.getPref('browser.tabs.loadDivertedInBackground')) {
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
	}
  
}; 
  
(function() { 
	var namespace = {};
	Components.utils.import('resource://openlinkintab-modules/utils.js', namespace);
	Components.utils.import('resource://openlinkintab-modules/autoNewTabHelper.js', namespace);
	OpenLinkInTabService.__proto__ = namespace.OpenLinkInTabUtils;
	OpenLinkInTabService.helper = namespace.autoNewTabHelper;

	window.addEventListener('DOMContentLoaded', OpenLinkInTabService, false);
	window.addEventListener('load', OpenLinkInTabService, false);
})();
 
