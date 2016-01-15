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
 * Portions created by the Initial Developer are Copyright (C) 2010-2016
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
 
var { OpenLinkInTabConstants } = Components.utils.import('resource://openlinkintab-modules/constants.js', {});
var { autoNewTabHelper } = Components.utils.import('resource://openlinkintab-modules/autoNewTabHelper.js', {});
var { inherit } = Components.utils.import('resource://openlinkintab-modules/inherit.jsm', {}); 
var { prefs } = Components.utils.import('resource://openlinkintab-modules/prefs.js', {}); 

var OpenLinkInTabUtils = inherit(OpenLinkInTabConstants, { 
	helper : autoNewTabHelper,

	isMac : Cc['@mozilla.org/xre/app-info;1'].getService(Ci.nsIXULAppInfo).QueryInterface(Ci.nsIXULRuntime).OS == 'Darwin',

	kID : 'openlinkintab-id',

	prefs : prefs,
	config : {
		get openOuterLinkInNewTab() {
			return OpenLinkInTabUtils.getMyPref('openOuterLinkInNewTab');
		},
		get openAnyLinkInNewTab() {
			return OpenLinkInTabUtils.getMyPref('openAnyLinkInNewTab');
		},
		get openOuterLinkInNewTabAsChild() {
			return OpenLinkInTabUtils.getMyPref('openOuterLinkInNewTab.asChild');
		},
		get openAnyLinkInNewTab() {
			return OpenLinkInTabUtils.getMyPref('openAnyLinkInNewTab');
		},
		get openAnyLinkInNewTabAsChild() {
			return OpenLinkInTabUtils.getMyPref('openAnyLinkInNewTab.asChild');
		},
		get useEffectiveTLD() {
			return OpenLinkInTabUtils.getMyPref('useEffectiveTLD');
		},
		get checkUserHome() {
			return OpenLinkInTabUtils.getMyPref('checkUserHome');
		},

		get debug() {
			return OpenLinkInTabUtils.getMyPref('debug');
		},

		get loadInBackground() {
			return prefs.getPref('browser.tabs.loadInBackground');
		},
		get openTabForMiddleClick() {
			return prefs.getPref('browser.tabs.opentabfor.middleclick');
		},
		get altClickSave() {
			return prefs.getPref('browser.altClickSave');
		}
	},

	updateHandleClickEventDomainMatcher : function OLITUtils_updateHandleClickEventDomainMatcher()
	{
		var value = this.getMyPref('handleEventsBeforeWebPages.domains');
		value = (value || '').replace(/\./g, '\\.')
					.replace(/\*/g, '.*')
					.replace(/\?/g, '.')
					.replace(/^[\s,\|]+|[\s,\|]+$/g, '')
					.replace(/[\s,\|]+/g, '|');
		try {
			this.config.handleClickEventDomainMatcher = new RegExp(value, 'i');
		}
		catch(e) {
			this.config.handleClickEventDomainMatcher = null;
		}
	},
 
/* utilities */ 
	
	isNewTabAction : function OLITUtils_isNewTabAction(aEvent) 
	{
		return (this.config.openTabForMiddleClick && aEvent.button == 1) ||
				(aEvent.button == 0 && this.isAccelKeyPressed(aEvent));
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
  

	checkReadyToOpenNewTabFromLink : function OLITUtils_checkReadyToOpenNewTabFromLink(aOptions) 
	{
		var options = inherit({
			external : {
				newTab : this.config.openOuterLinkInNewTab || this.config.openAnyLinkInNewTab,
				forceChild : this.config.openOuterLinkInNewTabAsChild
			},
			internal : {
				newTab : this.config.openAnyLinkInNewTab,
				forceChild : this.config.openAnyLinkInNewTabAsChild
			},
			useEffectiveTLD : this.config.useEffectiveTLD,
			checkUserHome   : this.config.checkUserHome
		}, aOptions);
		var result = this.helper.checkReadyToOpenNewTab(options);

		if (
			result.shouldOpenNewTab && result.ownerTab &&
			result.tabbrowser && 'treeStyleTab' in result.tabbrowser &&
			'readyToOpenChildTab' in result.tabbrowser.treeStyleTab
			)
			result.tabbrowser.treeStyleTab.readyToOpenChildTab(
				result.ownerTab,
				false,
				result.lastRelatedTab && result.lastRelatedTab.nextSibling
			);

		return result.shouldOpenNewTab;
	},
 
	whereToOpenLink : function OLITUtils_whereToOpenLink(aParams) 
	{
		var where = aParams.where || this.whereToOpenLinkPlain(aParams.action);
		var divertedToTab = false;
		var isNewTabAction = this.isNewTabAction(aParams.action);
		if (this.checkReadyToOpenNewTabFromLink({
				uri        : aParams.uri,
				sourceURI  : aParams.sourceURI,
				newTab     : isNewTabAction || aParams.newTabReadyLink,
				global     : aParams.global
			})) {
			if (where == 'current' && !isNewTabAction) {
				divertedToTab = true;
				where = 'tab';
			}
		}
		else if (where.indexOf('tab') > -1) {
			where = 'current';
		}
		return {
			where         : where,
			divertedToTab : divertedToTab
		};
	},

	// simulate whereToOpenLink() in utilityOverlay.js
	// http://mxr.mozilla.org/mozilla-central/source/browser/base/content/utilityOverlay.js#102
	whereToOpenLinkPlain : function OLITUtils_whereToOpenLinkPlain(aEvent)
	{
		if (this.isNewTabAction(aEvent))
			return (aEvent.shiftKey || this.config.loadInBackground) ? 'tabshifted' : 'tab' ;

		if (aEvent.altKey && this.config.altClickSave)
			return 'save';

		if (aEvent.shiftKey || (aEvent.button == 1 && !this.config.openTabForMiddleClick))
			return 'window';

		return 'current';
	},

	
	getMyPref : function OLITUtils_getMyPref(aPrefstring) 
	{
		return prefs.getPref(this.PREFROOT+'.'+aPrefstring);
	},
 
	setMyPref : function OLITUtils_setMyPref(aPrefstring, aNewValue) 
	{
		return prefs.setPref(this.PREFROOT+'.'+aPrefstring, aNewValue);
	},
 
	clearMyPref : function OLITUtils_clearMyPref(aPrefstring) 
	{
		return prefs.clearPref(this.PREFROOT+'.'+aPrefstring);
	},

	domains : [ 
		OpenLinkInTabConstants.PREFROOT,
		'browser.tabs.loadInBackground',
		'browser.tabs.opentabfor.middleclick',
		'browser.altClickSave'
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
			case this.PREFROOT + '.handleEventsBeforeWebPages.domains':
				this.updateHandleClickEventDomainMatcher();
				break;

			default:
				break;
		}
	},

	init : function OLITUtils_init() 
	{
		prefs.addPrefListener(this);
		this.updateHandleClickEventDomainMatcher();
	}
}); 

OpenLinkInTabUtils.init(); 
  
