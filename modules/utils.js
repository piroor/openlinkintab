/* ***** BEGIN LICENSE BLOCK ***** 
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is the Open Link in New Tab.
 *
 * The Initial Developer of the Original Code is YUKI "Piro" Hiroshi.
 * Portions created by the Initial Developer are Copyright (C) 2010-2014
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s): YUKI "Piro" Hiroshi <piro.outsider.reflex@gmail.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ******/
 
var EXPORTED_SYMBOLS = ['OpenLinkInTabUtils']; 

const Cc = Components.classes;
const Ci = Components.interfaces;
 
Components.utils.import('resource://openlinkintab-modules/prefs.js'); 
Components.utils.import('resource://openlinkintab-modules/autoNewTabHelper.js');
Components.utils.import('resource://openlinkintab-modules/inherit.jsm'); 

Components.utils.import('resource://openlinkintab-modules/namespace.jsm');
var window = getNamespaceFor('piro.sakura.ne.jp');
 
var OpenLinkInTabUtils = { 
	prefs : prefs,

	kPREFROOT : 'extensions.openlinkintab@piro.sakura.ne.jp',
	kID : 'openlinkintab-id',
	
	get XULAppInfo() { 
		if (!this._XULAppInfo) {
			this._XULAppInfo = Cc['@mozilla.org/xre/app-info;1'].getService(Ci.nsIXULAppInfo).QueryInterface(Ci.nsIXULRuntime);
		}
		return this._XULAppInfo;
	},
	_XULAppInfo : null,
	get Comparator() {
		if (!this._Comparator) {
			this._Comparator = Cc['@mozilla.org/xpcom/version-comparator;1'].getService(Ci.nsIVersionComparator);
		}
		return this._Comparator;
	},
	_Comparator : null,
 
/* utilities */ 
	
	isNewTabAction : function OLITUtils_isNewTabAction(aEvent) 
	{
		return aEvent.button == 1 || (aEvent.button == 0 && this.isAccelKeyPressed(aEvent));
	},
 
	isAccelKeyPressed : function OLITUtils_isAccelKeyPressed(aEvent) 
	{
		if ( // this is releasing of the accel key!
			(aEvent.type == 'keyup') &&
			(aEvent.keyCode == (this.isMac ? Ci.nsIDOMKeyEvent.DOM_VK_META : Ci.nsIDOMKeyEvent.DOM_VK_CONTROL ))
			) {
			return false;
		}
		return this.isMac ?
			(aEvent.metaKey || (aEvent.keyCode == Ci.nsIDOMKeyEvent.DOM_VK_META)) :
			(aEvent.ctrlKey || (aEvent.keyCode == Ci.nsIDOMKeyEvent.DOM_VK_CONTROL)) ;
	},
  
	checkReadyToOpenNewTabFromLink : function OLITUtils_checkReadyToOpenNewTabFromLink(aLink) 
	{
		var options = aLink;
		if (typeof aLink == 'string') {
			options = {
				link : { href : aLink }
			};
		}
		else if (aLink &&
				aLink.ownerDocument &&
				aLink instanceof aLink.ownerDocument.defaultView.Element) {
			while (aLink && !aLink.href) {
				aLink = aLink.parentNode;
			}
			if (aLink)
				options = { link : aLink };
		}
		options = inherit({
			external : {
				newTab : this.getMyPref('openOuterLinkInNewTab') || this.getMyPref('openAnyLinkInNewTab'),
				forceChild : this.getMyPref('openOuterLinkInNewTab.asChild')
			},
			internal : {
				newTab : this.getMyPref('openAnyLinkInNewTab'),
				forceChild : this.getMyPref('openAnyLinkInNewTab.asChild')
			},
			useEffectiveTLD : this.getMyPref('useEffectiveTLD'),
			checkUserHome   : this.getMyPref('checkUserHome')
		}, options);
		options.uri = options.link.href;
		var result = window['piro.sakura.ne.jp'].autoNewTabHelper.checkReadyToOpenNewTab(options);

		if (
			result.open && result.owner &&
			'treeStyleTab' in result.tabbrowser &&
			'readyToOpenChildTab' in result.tabbrowser.treeStyleTab
			)
			result.tabbrowser.treeStyleTab.readyToOpenChildTab(
				result.owner,
				false,
				result.lastRelatedTab && result.lastRelatedTab.nextSibling
			);

		return result.open;
	},
 
	filterWhereToOpenLink : function OLITUtils_filterwhereToOpenLink(aWhere, aParams) 
	{
		var inverted = false;
		var divertedToTab = false;
		var link = aParams.linkNode || aParams.event.originalTarget;
		var isNewTab = this.isNewTabAction(aParams.event);
		if (this.checkReadyToOpenNewTabFromLink({
				link     : link,
				modifier : isNewTab,
				invert   : this.getMyPref('link.invertDefaultBehavior')
			})) {
			if (aWhere == 'current' && !isNewTab) {
				divertedToTab = true;
				aWhere = prefs.getPref('browser.tabs.loadInBackground') ? 'tabshifted' : 'tab' ;
			}
		}
		else if (aWhere.indexOf('tab') > -1) {
			aWhere = 'current';
			inverted = true;
		}
		return {
			where         : aWhere,
			inverted      : inverted,
			divertedToTab : divertedToTab
		};
	},
 
	readyToOpenDivertedTab : function OLITUtils_readyToOpenDivertedTab(aFrameOrTabBrowser) 
	{
		var frame = window['piro.sakura.ne.jp'].autoNewTabHelper.getFrameFromTabBrowserElements(aFrameOrTabBrowser);
		if (!frame) return;
		var ownerBrowser = window['piro.sakura.ne.jp'].autoNewTabHelper.getTabBrowserFromFrame(frame);
		ownerBrowser.__openlinkintab__readiedToOpenDivertedTab = true;
	},
 
/* Pref Listener */ 
	
	domains : [ 
		'browser.link.open_newwindow.restriction'
	],
 
	observe : function OLITUtils_observe(aSubject, aTopic, aData)
	{
		if (aTopic == 'nsPref:changed')
			this.onPrefChange(aData);
	},
 
	onPrefChange : function OLITUtils_onPrefChange(aPrefName) 
	{
		var value = prefs.getPref(aPrefName);
		switch (aPrefName)
		{
			case 'browser.link.open_newwindow.restriction':
				if (this.prefOverriding) return;
				aPrefName += '.override';
				prefs.setPref(aPrefName, value);
			case 'browser.link.open_newwindow.restriction.override':
				if (prefs.getPref(aPrefName+'.force')) {
					let defaultValue = this.getDefaultPref(aPrefName);
					if (value != defaultValue) {
						prefs.setPref(aPrefName, defaultValue);
						return;
					}
				}
				this.prefOverriding = true;
				{
					let target = aPrefName.replace('.override', '');
					let originalValue = prefs.getPref(target);
					if (originalValue !== null && originalValue != value)
						prefs.setPref(target+'.backup', originalValue);
					prefs.setPref(target, prefs.getPref(aPrefName));
				}
				this.prefOverriding = false;
				break;

			default:
				break;
		}
	},
  
/* Save/Load Prefs */ 
	
	getMyPref : function OLITUtils_getMyPref(aPrefstring) 
	{
		return prefs.getPref(this.kPREFROOT+'.'+aPrefstring);
	},
 
	setMyPref : function OLITUtils_setMyPref(aPrefstring, aNewValue) 
	{
		return prefs.setPref(this.kPREFROOT+'.'+aPrefstring, aNewValue);
	},
 
	clearMyPref : function OLITUtils_clearMyPref(aPrefstring) 
	{
		return prefs.clearPref(this.kPREFROOT+'.'+aPrefstring);
	},
  
	init : function OLITUtils_init() 
	{
		this.isMac = this.XULAppInfo.OS == 'Darwin';
		prefs.addPrefListener(this);
		this.onPrefChange('browser.link.open_newwindow.restriction.override');
	}
 
}; 
 
OpenLinkInTabUtils.init(); 
  
