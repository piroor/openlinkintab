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
 
var EXPORTED_SYMBOLS = ['OpenLinkInTabChromeUtils']; 

const Cc = Components.classes;
const Ci = Components.interfaces;
 
var { autoNewTabHelper } = Components.utils.import('resource://openlinkintab-modules/autoNewTabHelper.js', {});
var { inherit } = Components.utils.import('resource://openlinkintab-modules/inherit.jsm', {}); 
var { OpenLinkInTabUtils } = Components.utils.import('resource://openlinkintab-modules/utils.js', {}); 
var { prefs } = Components.utils.import('resource://openlinkintab-modules/prefs.js', {}); 
 
var OpenLinkInTabChromeUtils = inherit(OpenLinkInTabUtils, { 
 
/* Pref Listener */ 
	
	domains : OpenLinkInTabUtils.domains.concat([ 
		'browser.link.open_newwindow.restriction'
	]),
 
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
				OpenLinkInTabUtils.onPrefChange.call(this, aPrefName);
				break;
		}
	},
  
  
	init : function OLITUtils_init() 
	{
		OpenLinkInTabUtils.init.call(this);
		this.onPrefChange('browser.link.open_newwindow.restriction.override');

		var { ContentClick } = Components.utils.import('resource:///modules/ContentClick.jsm', {});
		
		eval('ContentClick.contentAreaClick = '+ContentClick.contentAreaClick.toString().replace(
			'where = window.whereToOpenLink(json);',
			'$&\n' +
			'  var OLITFilteringResult = OpenLinkInTabChromeUtils.whereToOpenLink({\n' +
			'        where           : where, \n' +
			'        uri             : json.href, \n' +
			'        sourceURI       : json.__openlinkintab__sourceURI || window.gBrowser.currentURI.spec, \n' + // ???
			'        newTabReadyLink : json.__openlinkintab__newTabReadyLink, \n' + // ???
			'        action          : json, \n' +
			'        global          : window \n' +
			'      });\n' +
			'  where = OLITFilteringResult.where;\n' +
//			'  window.alert([JSON.stringify(OLITFilteringResult), JSON.stringify(json)]);\n' +
			'  if (OLITFilteringResult.divertedToTab)\n' +
			'    window.gBrowser.__openlinkintab__readiedToOpenDivertedTab = true;\n'
		).replace(
			/(if \([^\)]*where == "current")/,
			'$1 && !OLITFilteringResult.inverted'
		));
	}
 
}); 
 
OpenLinkInTabChromeUtils.init(); 
  
