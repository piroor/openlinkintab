/**
 * @fileOverview Helper Library for Automatic New Tab Features
 * @author       YUKI "Piro" Hiroshi
 * @version      11
 *
 * @license
 *   The MIT License, Copyright (c) 2009-2016 YUKI "Piro" Hiroshi.
 *   http://github.com/piroor/fxaddonlib-auto-new-tab-helper/blob/master/license.txt
 * @url http://github.com/piroor/fxaddonlib-auto-new-tab-helper
 */
 
var EXPORTED_SYMBOLS = ['autoNewTabHelper'];
 
const Cc = Components.classes;
const Ci = Components.interfaces;
	
var autoNewTabHelper = { 
	kID : 'checknewtab-id',
	
	get _IOService() { 
		if (!this.__IOService) {
			this.__IOService = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService);
		}
		return this.__IOService;
	},
	__IOService : null,

	get _WindowMediator() {
		if (!this.__WindowMediator) {
			this.__WindowMediator = Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator);
		}
		return this.__WindowMediator;
	},
	__WindowMediator : null,

	get _EffectiveTLD()
	{
		if (!('__EffectiveTLD' in this)) {
			this.__EffectiveTLD = 'nsIEffectiveTLDService' in Ci ?
				Cc['@mozilla.org/network/effective-tld-service;1'].getService(Ci.nsIEffectiveTLDService) :
				null ;
		}
		return this.__EffectiveTLD;
	},
//	__EffectiveTLD : null,

	get _URIFixup()
	{
		if (!('__URIFixup' in this)) {
			this.__URIFixup = Cc['@mozilla.org/docshell/urifixup;1'].getService(Ci.nsIURIFixup);
		}
		return this.__URIFixup;
	},

	get _Task()
	{
		if (!this.__Task) {
			let TaskNS = {};
			Components.utils.import('resource://gre/modules/Task.jsm', TaskNS);
			this.__Task = TaskNS.Task;
		}
		return this.__Task;
	},
 
/* utilities */ 
	
	get browserWindow() 
	{
		return this._WindowMediator.getMostRecentWindow('navigator:browser');
	},
 
	get browser() 
	{
		var w = this.browserWindow;
		return w && w.gBrowser;
	},
 
// tabbrowser 
 
	getTabBrowserFromChild : function OLITUtils_getTabBrowserFromChild(aTabBrowserChild) 
	{
		if (!aTabBrowserChild)
			return null;

		if (aTabBrowserChild.localName == 'tabbrowser') // itself
			return aTabBrowserChild;

		if (aTabBrowserChild.tabbrowser) // tabs, Firefox 4.0 or later
			return aTabBrowserChild.tabbrowser;

		if (aTabBrowserChild.id == 'TabsToolbar') // tabs toolbar, Firefox 4.0 or later
			return aTabBrowserChild.getElementsByTagName('tabs')[0].tabbrowser;

		var b = aTabBrowserChild.ownerDocument.evaluate(
				'ancestor::*[local-name()="tabbrowser"] | '+
				'ancestor::*[local-name()="tabs" and @tabbrowser] |'+
				'ancestor::*[local-name()="toolbar" and @id="TabsToolbar"]/descendant::*[local-name()="tabs"]',
				aTabBrowserChild,
				null,
				Ci.nsIDOMXPathResult.FIRST_ORDERED_NODE_TYPE,
				null
			).singleNodeValue;
		return (b && b.tabbrowser) || b;
	},
   
/* get tab(s) */ 
	
	_getTabId : function OLITUtils_getTabId(aTab) 
	{
		if (!aTab)
			return '';
		var id = aTab.getAttribute(this.kID);
		if (!id) {
			id = 'tab-<'+Date.now()+'-'+parseInt(Math.random() * 65000)+'>';
			aTab.setAttribute(this.kID, id);
		}
		return id;
	},
 
	_getTabById : function OLITUtils_getTabById(aId, aTabBrowserChildren) 
	{
		if (!aId) return null;
		var b = this.getTabBrowserFromChild(aTabBrowserChildren) || this.browser;
		return b.ownerDocument.evaluate(
			'descendant::*[local-name()="tab" and @'+this.kID+' = "'+aId+'"]',
			b.mTabContainer,
			null,
			Ci.nsIDOMXPathResult.FIRST_ORDERED_NODE_TYPE,
			null
		).singleNodeValue;
	},
 
	_getNextVisibleTab : function OLITUtils_getNextVisibleTab(aTab) 
	{
		if (!aTab) return null;
		var next = aTab;
		do {
			next = next.nextSibling;
		}
		while (next && next.boxObject.width && next.boxObject.height);
		return next;
	},
  
	/*
	 params:
	   global: the global object of the caller's namespace
	   uri: uri ustring (or a nsIURI instance)
	   external: hash
	     external.newTab: bool
	     external.forceChild: bool
	   internal: hash
	     internal.newTab: bool
	     internal.forceChild: bool
	   useEffectiveTLD: bool
	   checkUserHome: bool
	   sourceURI: uri string
	   newTab: bool
	   invert: bool

	   sourceTab: XUL element
	 */
	checkReadyToOpenNewTab : function OLITUtils_checkReadyToOpenNewTab(aParams) 
	{
/*
	�����̐���

	�E���݂̃T�C�g�ƈقȂ�T�C�g��ǂݍ��ޏꍇ�Ƀ^�u���J�����F
	  �����ɉ������Ȃ��B�V�����J���^�u���q�^�u�ɂ���ꍇ�͕ʓr
	    readyToOpenChildTab���g���B

	�E���݂̃T�C�g�Ɠ����T�C�g�̃y�[�W��ǂݍ��ޏꍇ�Ƀ^�u���J�����F
	  ���e�̃^�u�͓����T�C�g���H
	    No �F�q�^�u���J��
	    Yes�F�Z��Ƃ��ă^�u���J���B�������A���̃^�u����̃^�u�͂��ׂ�
	         ���݂̃^�u�Ǝ��̌Z��^�u�Ƃ̊ԂɊJ����A���z�T�u�c���[�ƂȂ�B
	         �����݂̃^�u�Ɂu__autoNewTabHelper__next�v�v���p�e�B��
	           ���邩�H
	           Yes�F__autoNewTabHelper__next�Ŏ����ꂽ�^�u�̒��O��
	                �V�����Z��^�u��}������B
	           No �F���݂̃^�u�̎��̌Z��^�u��ID��__autoNewTabHelper__next
	                �v���p�e�B�ɕێ����A���z�̎q�^�u��}������ʒu��
	                ��Ƃ���B
*/

		aParams = aParams || { uri : '' };
		try{
			aParams.uri = this._URIFixup.createFixupURI(aParams.uri, Ci.nsIURIFixup.FIXUP_FLAG_USE_UTF8);
			aParams.uri = aParams.uri.spec || '';
		}
		catch(e) {
		}

		if (/^(javascript|moz-action|mailto):/.test(aParams.uri))
			return false;

		var external = aParams.external || {};
		var internal = aParams.internal || {};

		var useEffectiveTLD = 'useEffectiveTLD' in aParams ? aParams.useEffectiveTLD : true ;
		var checkUserHome = 'checkUserHome' in aParams ? aParams.checkUserHome : true ;

		var targetHost  = this._getDomainFromURI(aParams.uri, useEffectiveTLD, checkUserHome);
		var sourceURI   = aParams.sourceURI;
		var sourceHost  = this._getDomainFromURI(sourceURI, useEffectiveTLD, checkUserHome);

		// tab detection: unavailable on the content process
		var sourceTab   = aParams.sourceTab;
		var tabbrowser  = sourceTab ? this.getTabBrowserFromChild(sourceTab.linkedBrowser) : null ;
		var TST         = tabbrowser && 'treeStyleTab' in tabbrowser ? tabbrowser.treeStyleTab : null ;
		var ownerTab    = TST ?
							TST.getParentTab(sourceTab) :
						sourceTab ?
							sourceTab.owner :
							null ;
		var ownerURI    = ownerTab ? ownerTab.linkedBrowser.currentURI : null ;
		var ownerHost   = this._getDomainFromURI(ownerURI, useEffectiveTLD, checkUserHome);

		var shouldOpenNewTab = Boolean(aParams.newTab);
		var nextOwnerTab = null;
		var lastRelated  = null;

		var global = aParams.global;
		var isBlank = global && global.isBlankPageURL ? global.isBlankPageURL(sourceURI) : (sourceURI == 'about:blank');
		if (
			internal.newTab &&
			sourceHost == targetHost &&
			!this._isRedirectorLink(aParams.uri, targetHost, sourceHost) &&
			!isBlank &&
			sourceURI.split('#')[0] != aParams.uri.split('#')[0]
			) {
			shouldOpenNewTab = aParams.newTab && aParams.invert ? !shouldOpenNewTab : true ;
			nextOwnerTab = ('forceChild' in internal && !internal.forceChild) ? null :
					(ownerHost == targetHost && !internal.forceChild) ? ownerTab :
					sourceTab ;
			let nextTab = TST ?
							TST.getNextSiblingTab(sourceTab) :
							this._getNextVisibleTab(sourceTab) ;
			let insertNewChildAtFirst = false;
			if (TST) {
				try {
					insertNewChildAtFirst = Cc['@mozilla.org/preferences;1']
											.getService(Ci.nsIPrefBranch)
											.getIntPref('extensions.treestyletab.insertNewChildAt') == 0;
				}
				catch(e) {
				}
			}
			let insertBefore = tabbrowser && ownerHost == targetHost && !internal.forceChild &&
					(insertNewChildAtFirst ?
						nextTab :
						(
							this._getTabById(sourceTab.__autoNewTabHelper__next, tabbrowser) ||
							(nextTab ? (sourceTab.__autoNewTabHelper__next = this._getTabId(nextTab), nextTab) : null )
						)
					);
			lastRelated = insertBefore ? insertBefore.previousSibling : null ;
		}
		else if (
			external.newTab &&
			(
				sourceHost != targetHost || 
				this._isRedirectorLink(aParams.uri, targetHost, sourceHost)
			) &&
			!isBlank
			) {
			shouldOpenNewTab = aParams.newTab && aParams.invert ? !shouldOpenNewTab : true ;
			if (external.forceChild)
				nextOwnerTab = sourceTab;
		}

		return {
			shouldOpenNewTab : shouldOpenNewTab,
			ownerTab         : nextOwnerTab,
			lastRelatedTab   : lastRelated,
			tabbrowser       : tabbrowser,
			sourceHost : sourceHost,
			targetHost : targetHost
		};
	},
 
	_getDomainFromURI : function OLITUtils__getDomainFromURI(aURI, aUseEffectiveTLD, aCheckUserHome) 
	{
		if (!aURI) return null;

		var str = aURI;
		if (str instanceof Ci.nsIURI) str = aURI.spec;

		var userHomePart = aCheckUserHome ? str.match(/^\w+:\/\/[^\/]+(\/~[^\/]+)\//) : '' ;
		userHomePart = (userHomePart && userHomePart[1]) || '';

		if (aUseEffectiveTLD && this._EffectiveTLD) {
			try {
				var uri = aURI;
				if (!(uri instanceof Ci.nsIURI)) uri = this._makeURIFromSpec(uri);
				var domain = this._EffectiveTLD.getBaseDomain(uri, 0);
				if (domain) return domain + userHomePart;
			}
			catch(e) {
			}
		}

		var domainMatchResult = str.match(/^\w+:(?:\/\/)?([^:\/]+)/);
		return domainMatchResult ?
				domainMatchResult[1] + userHomePart :
				null ;
	},
	
	_makeURIFromSpec : function OLITUtils_makeURIFromSpec(aURI) 
	{
		var newURI;
		aURI = aURI || '';
		if (aURI && String(aURI).indexOf('file:') == 0) {
			var fileHandler = this._IOService.getProtocolHandler('file').QueryInterface(Ci.nsIFileProtocolHandler);
			var tempLocalFile = fileHandler.getFileFromURLSpec(aURI);
			newURI = this._IOService.newFileURI(tempLocalFile);
		}
		else {
			if (!/^\w+\:/.test(aURI)) aURI = 'http://'+aURI;
			newURI = this._IOService.newURI(aURI, null, null);
		}
		return newURI;
	},
 
	_isRedirectorLink : function OLITUtils_isRedirectorLink(aURIToOpen, aTargetHost, aSourceHost) 
	{
		if (aTargetHost != aSourceHost) return false;

		var isGoogleRedirectLink = /https?:\/\/[^\/]*\.google\.[^\/]+\/url\?/.test(aURIToOpen);
		return isGoogleRedirectLink;
	}
   
};
