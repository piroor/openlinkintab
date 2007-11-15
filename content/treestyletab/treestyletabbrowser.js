function TreeStyleTabBrowser(aTabBrowser) 
{
	this.mTabBrowser = aTabBrowser;
}
 
TreeStyleTabBrowser.prototype = { 
	
	mTabBrowser : null, 

	tabbarResizing : false,

	levelMargin          : -1,
	levelMarginProp      : 'margin-left',
	positionProp         : 'screenY',
	sizeProp             : 'height',
	invertedPositionProp : 'screenX',
	invertedSizeProp     : 'width',
 
	get container() 
	{
		if (!this._container) {
			this._container = document.getElementById('appcontent');
		}
		return this._container;
	},
	_container : null,
 
/* utils */ 
	
/* get tab(s) */ 
	
	getTabById : function(aId) 
	{
		if (!aId) return null;
		return this.evaluateXPath(
				'descendant::xul:tab[@'+this.kID+' = "'+aId+'"]',
				this.mTabBrowser.mTabContainer,
				XPathResult.FIRST_ORDERED_NODE_TYPE
			).singleNodeValue;
	},
 
	getNextVisibleTab : function(aTab) 
	{
		var xpathResult = this.evaluateXPath(
				'following-sibling::xul:tab[not(@'+this.kCOLLAPSED+'="true")]',
				aTab
			);
		return xpathResult.snapshotItem(0);
	},
 
	getPreviousVisibleTab : function(aTab) 
	{
		var xpathResult = this.evaluateXPath(
				'preceding-sibling::xul:tab[not(@'+this.kCOLLAPSED+'="true")]',
				aTab
			);
		return xpathResult.snapshotItem(xpathResult.snapshotLength-1);
	},
  
/* tree */ 
	
	get rootTabs() 
	{
		return this.getArrayFromXPathResult(
				this.evaluateXPath(
					'child::xul:tab[not(@'+this.kNEST+') or @'+this.kNEST+'="0" or @'+this.kNEST+'=""]',
					this.mTabBrowser.mTabContainer
				)
			);
	},
 
	getParentTab : function(aTab) 
	{
		if (!aTab) return null;
		var id = aTab.getAttribute(this.kID);
		if (!id) return null; // not initialized yet
		return this.evaluateXPath(
				'parent::*/child::xul:tab[contains(@'+this.kCHILDREN+', "'+id+'")]',
				aTab,
				XPathResult.FIRST_ORDERED_NODE_TYPE
			).singleNodeValue;
	},
 
	getRootTab : function(aTab) 
	{
		var parent = aTab;
		var root   = aTab;
		while (parent = this.getParentTab(parent))
		{
			root = parent;
		}
		return root;
	},
 
	getNextSiblingTab : function(aTab) 
	{
		if (!aTab) return null;

		var parentTab = this.getParentTab(aTab);

		if (!parentTab) {
			var next = aTab;
			do {
				next = next.nextSibling;
			}
			while (next && this.getParentTab(next));
			return next;
		}

		var b        = this.mTabBrowser;
		var children = parentTab.getAttribute(this.kCHILDREN);
		if (children) {
			var list = ('|'+children).split('|'+aTab.getAttribute(this.kID))[1].split('|');
			for (var i = 0, maxi = list.length; i < maxi; i++)
			{
				var firstChild = this.getTabById(list[i]);
				if (firstChild) return firstChild;
			}
		}
		return null;
	},
 
	getPreviousSiblingTab : function(aTab) 
	{
		if (!aTab) return null;

		var parentTab = this.getParentTab(aTab);

		if (!parentTab) {
			var prev = aTab;
			do {
				prev = prev.previousSibling;
			}
			while (prev && this.getParentTab(prev));
			return prev;
		}

		var b        = this.mTabBrowser;
		var children = parentTab.getAttribute(this.kCHILDREN);
		if (children) {
			var list = ('|'+children).split('|'+aTab.getAttribute(this.kID))[0].split('|');
			for (var i = list.length-1; i > -1; i--)
			{
				var lastChild = this.getTabById(list[i])
				if (lastChild) return lastChild;
			}
		}
		return null;
	},
 
	getChildTabs : function(aTab, aAllTabsArray) 
	{
		var tabs = [];
		if (!aTab) return null;

		var children = aTab.getAttribute(this.kCHILDREN);
		if (!children) return tabs;

		if (aAllTabsArray) tabs = aAllTabsArray;

		var list = children.split('|');
		var b    = this.mTabBrowser;
		var tab;
		for (var i = 0, maxi = list.length; i < maxi; i++)
		{
			tab = this.getTabById(list[i])
			if (!tab) continue;
			tabs.push(tab);
			if (aAllTabsArray)
				this.getChildTabs(tab, tabs);
		}

		return tabs;
	},
 
	getDescendantTabs : function(aTab) 
	{
		var tabs = [];
		this.getChildTabs(aTab, tabs);
		return tabs;
	},
 
	getFirstChildTab : function(aTab) 
	{
		if (!aTab) return null;

		var b          = this.mTabBrowser;
		var children   = aTab.getAttribute(this.kCHILDREN);
		var firstChild = null;
		if (children) {
			var list = children.split('|');
			for (var i = 0, maxi = list.length; i < maxi; i++)
			{
				firstChild = this.getTabById(list[i])
				if (firstChild) break;
			}
		}
		return firstChild;
	},
 
	getLastChildTab : function(aTab) 
	{
		if (!aTab) return null;

		var b         = this.mTabBrowser;
		var children  = aTab.getAttribute(this.kCHILDREN);
		var lastChild = null;
		if (children) {
			var list = children.split('|');
			for (var i = list.length-1; i > -1; i--)
			{
				lastChild = this.getTabById(list[i])
				if (lastChild) break;
			}
		}
		return lastChild;
	},
  
/* Session Store API */ 
	
	getTabValue : function(aTab, aKey) 
	{
		var value = null;
		try {
			value = this.SessionStore.getTabValue(aTab, aKey);
		}
		catch(e) {
		}

		return value;
	},
 
	setTabValue : function(aTab, aKey, aValue) 
	{
		if (!aValue) {
			return this.deleteTabValue(aTab, aKey);
		}
		aTab.setAttribute(aKey, aValue);
		try {
			this.SessionStore.setTabValue(aTab, aKey, aValue);
		}
		catch(e) {
		}
		return aValue;
	},
 
	deleteTabValue : function(aTab, aKey) 
	{
		aTab.removeAttribute(aKey);
		try {
			this.SessionStore.deleteTabValue(aTab, aKey);
		}
		catch(e) {
		}
	},
  
	getTabLabel : function(aTab) 
	{
		var label = document.getAnonymousElementByAttribute(aTab, 'class', 'tab-text-container') || // Tab Mix Plus
					document.getAnonymousElementByAttribute(aTab, 'class', 'tab-text');
		return label;
	},
 
	getTabClosebox : function(aTab) 
	{
		var close = document.getAnonymousElementByAttribute(aTab, 'class', 'tab-close-button tabs-closebutton always-right') || // Tab Mix Plus
					document.getAnonymousElementByAttribute(aTab, 'class', 'tab-close-button');
		return close;
	},
 
	get isVertical() 
	{
		var b = this.mTabBrowser;
		if (!b) return false;
		var box = b.mTabContainer.mTabstrip || b.mTabContainer ;
		return (box.getAttribute('orient') || window.getComputedStyle(box, '').getPropertyValue('-moz-box-orient')) == 'vertical';
	},
 
	isTabInViewport : function(aTab) 
	{
		if (!aTab) return false;
		var tabBox = aTab.boxObject;
		var barBox = this.mTabBrowser.mTabContainer.mTabstrip.boxObject;
		return (tabBox.screenX >= barBox.screenX &&
			tabBox.screenX + tabBox.width <= barBox.screenX + barBox.width &&
			tabBox.screenY >= barBox.screenY &&
			tabBox.screenY + tabBox.height <= barBox.screenY + barBox.height);
	},
  
/* commands */ 
	
/* attach/part */ 
	
	attachTabTo : function(aChild, aParent, aInfo) 
	{
		if (
			!aChild ||
			!aParent ||
			aChild == aParent ||
			this.getParentTab(aChild) == aParent
			)
			return;

		if (!aInfo) aInfo = {};

		var id = aChild.getAttribute(this.kID);
		if (!id || !aParent.getAttribute(this.kID))
			return; // if the tab is not initialized yet, do nothing.

		this.partTab(aChild, true);

		var children = aParent.getAttribute(this.kCHILDREN);
		var newIndex;

		if (children.indexOf(id) > -1) {
			children = ('|'+children).replace('|'+id, '').replace(/^\|/);
		}

		var insertBefore = aInfo.insertBefore;
		var beforeTab = insertBefore ? insertBefore.getAttribute(this.kID) : null ;
		if (beforeTab && children.indexOf(beforeTab) > -1) {
			children = children.replace(beforeTab, id+'|'+beforeTab);
			newIndex = insertBefore._tPos;
		}
		else {
			children = ((children || '')+'|'+id).replace(/^\|/, '');
			var refTab = aParent;
			var descendant = this.getDescendantTabs(aParent);
			if (descendant.length) refTab = descendant[descendant.length-1];
			newIndex = refTab._tPos+1;
		}

		this.setTabValue(aParent, this.kCHILDREN, children);
		this.setTabValue(aChild, this.kPARENT, aParent.getAttribute(this.kID));
		this.updateTabsCount(aParent);

		if (newIndex > aChild._tPos) newIndex--;
		this.moveTabSubTreeTo(aChild, newIndex);

		if (!aInfo.dontExpand) {
			if (
/*
				(
					aParent.getAttribute(this.kSUBTREE_COLLAPSED) == 'true' ||
					children.indexOf('|') > -1 // not a first child
				) &&
*/
				this.getTreePref('autoCollapseExpandSubTreeOnSelect')
				) {
				this.collapseExpandTreesIntelligentlyFor(aParent);
				var p = aParent;
				do {
					this.collapseExpandTabSubTree(p, false);
				}
				while (p = this.getParentTab(p));
			}
			else if (aParent.getAttribute(this.kSUBTREE_COLLAPSED) == 'true') {
				if (this.getTreePref('autoExpandSubTreeOnAppendChild')) {
					var p = aParent;
					do {
						this.collapseExpandTabSubTree(p, false);
					}
					while (p = this.getParentTab(p));
				}
				else
					this.collapseExpandTab(aChild, true);
			}

			if (aParent.getAttribute(this.kCOLLAPSED) == 'true')
				this.collapseExpandTab(aChild, true);
		}
		else if (aParent.getAttribute(this.kSUBTREE_COLLAPSED) == 'true' ||
				aParent.getAttribute(this.kCOLLAPSED) == 'true') {
			this.collapseExpandTab(aChild, true);
		}

		if (!aInfo.dontUpdateIndent) {
			this.updateTabsIndent([aChild]);
			this.checkTabsIndentOverflow();
		}
	},
 
	partTab : function(aChild, aDontUpdateIndent) 
	{
		if (!aChild) return;

		var parentTab = this.getParentTab(aChild);
		if (!parentTab) return;

		var id = aChild.getAttribute(this.kID);
		var children = ('|'+parentTab.getAttribute(this.kCHILDREN))
						.replace(new RegExp('\\|'+id), '')
						.replace(/^\|/, '');
		this.setTabValue(parentTab, this.kCHILDREN, children);
		this.updateTabsCount(parentTab);

		if (!aDontUpdateIndent) {
			this.updateTabsIndent([aChild]);
			this.checkTabsIndentOverflow();
		}
	},
 
	updateTabsIndent : function(aTabs, aLevel, aProp) 
	{
		if (!aTabs || !aTabs.length) return;

		if (aLevel === void(0)) {
			var parentTab = this.getParentTab(aTabs[0]);
			var aLevel = 0;
			while (parentTab)
			{
				aLevel++;
				parentTab = this.getParentTab(parentTab);
			}
		}

		var b = this.mTabBrowser;
		if (!aProp) {
			aProp = this.getTreePref('enableSubtreeIndent') ? this.levelMarginProp : 0 ;
		}
		var margin = this.levelMargin < 0 ? this.baseLebelMargin : this.levelMargin ;
		var indent = margin * aLevel;

		for (var i = 0, maxi = aTabs.length; i < maxi; i++)
		{
			aTabs[i].setAttribute('style', aTabs[i].getAttribute('style').replace(/margin(-[^:]+):[^;]+;?/g, '')+'; '+aProp+':'+indent+'px !important;');
			aTabs[i].setAttribute(this.kNEST, aLevel);
			this.updateTabsIndent(this.getChildTabs(aTabs[i]), aLevel+1, aProp);
		}
	},
 
	updateAllTabsIndent : function() 
	{
		this.updateTabsIndent(this.rootTabs, 0);
//		this.checkTabsIndentOverflow();
	},
 
	checkTabsIndentOverflow : function() 
	{
		if (this.checkTabsIndentOverflowTimer) {
			window.clearTimeout(this.checkTabsIndentOverflowTimer);
			this.checkTabsIndentOverflowTimer = null;
		}
		this.checkTabsIndentOverflowTimer = window.setTimeout(function(aSelf) {
			aSelf.checkTabsIndentOverflowCallback();
		}, 100, this);
	},
	checkTabsIndentOverflowTimer : null,
	checkTabsIndentOverflowCallback : function()
	{
		var b    = this.mTabBrowser;
		var tabs = this.getArrayFromXPathResult(this.evaluateXPath(
				'child::xul:tab[@'+this.kNEST+' and not(@'+this.kNEST+'="0" or @'+this.kNEST+'="")]',
				b.mTabContainer
			));
		if (!tabs.length) return;

		var self = this;
		tabs.sort(function(aA, aB) { return Number(aA.getAttribute(self.kNEST)) - Number(aB.getAttribute(self.kNEST)); });
		var nest = tabs[tabs.length-1].getAttribute(self.kNEST);
		if (!nest) return;

		var oldMargin = this.levelMargin;
		var indent    = (oldMargin < 0 ? this.baseLebelMargin : oldMargin ) * nest;
		var maxIndent = b.mTabContainer.childNodes[0].boxObject[this.invertedSizeProp] * 0.33;

		var marginUnit = Math.max(Math.floor(maxIndent / nest), 1);
		if (indent > maxIndent) {
			this.levelMargin = marginUnit;
		}
		else {
			this.levelMargin = -1;
			if ((this.baseLebelMargin * nest) > maxIndent)
				this.levelMargin = marginUnit;
		}

		if (oldMargin != this.levelMargin) {
			this.updateAllTabsIndent();
		}
	},
 
	updateTabsCount : function(aTab) 
	{
		var count = document.getAnonymousElementByAttribute(aTab, 'class', this.kCOUNTER);
		if (count) {
			count.setAttribute('value', '('+this.getDescendantTabs(aTab).length+')');
		}
		var parent = this.getParentTab(aTab);
		if (parent)
			this.updateTabsCount(parent);
	},
  
/* move */ 
	
	moveTabSubTreeTo : function(aTab, aIndex) 
	{
		if (!aTab) return;

		var b = this.mTabBrowser;
		this.isSubTreeMoving = true;

		this.internallyTabMoving = true;
		b.moveTabTo(aTab, aIndex);
		this.internallyTabMoving = false;

		this.isSubTreeChildrenMoving = true;
		this.internallyTabMoving     = true;
		var tabs = this.getDescendantTabs(aTab);
		for (var i = 0, maxi = tabs.length; i < maxi; i++)
		{
			b.moveTabTo(tabs[i], aTab._tPos+i+(aTab._tPos < tabs[i]._tPos ? 1 : 0 ));
		}
		this.internallyTabMoving     = false;
		this.isSubTreeChildrenMoving = false;

		this.isSubTreeMoving = false;
	},
 
	moveTabLevel : function(aEvent) 
	{
		var b = this.mTabBrowser;
		var parentTab = this.getParentTab(b.mCurrentTab);
		if (aEvent.keyCode == KeyEvent.DOM_VK_RIGHT) {
			var prevTab = this.getPreviousSiblingTab(b.mCurrentTab);
			if ((!parentTab && prevTab) ||
				(parentTab && b.mCurrentTab != this.getFirstChildTab(parentTab))) {
				this.attachTabTo(b.mCurrentTab, prevTab);
				b.mCurrentTab.focus();
				return true;
			}
		}
		else if (aEvent.keyCode == KeyEvent.DOM_VK_LEFT && parentTab) {
			var grandParent = this.getParentTab(parentTab);
			if (grandParent) {
				this.attachTabTo(b.mCurrentTab, grandParent, {
					insertBefore : this.getNextSiblingTab(parentTab)
				});
				b.mCurrentTab.focus();
				return true;
			}
			else {
				var nextTab = this.getNextSiblingTab(parentTab);
				this.partTab(b.mCurrentTab);
				this.internallyTabMoving = true;
				if (nextTab) {
					b.moveTabTo(b.mCurrentTab, nextTab._tPos - 1);
				}
				else {
					b.moveTabTo(b.mCurrentTab, b.mTabContainer.lastChild._tPos);
				}
				this.internallyTabMoving = false;
				b.mCurrentTab.focus();
				return true;
			}
		}
		return false;
	},
  
/* collapse/expand */ 
	
	collapseExpandTabSubTree : function(aTab, aCollapse) 
	{
		if (!aTab) return;

		if ((aTab.getAttribute(this.kSUBTREE_COLLAPSED) == 'true') == aCollapse) return;

		var b = this.mTabBrowser;
		this.doingCollapseExpand = true;

		this.setTabValue(aTab, this.kSUBTREE_COLLAPSED, aCollapse);

		var tabs = this.getChildTabs(aTab);
		for (var i = 0, maxi = tabs.length; i < maxi; i++)
		{
			this.collapseExpandTab(tabs[i], aCollapse);
		}

		if (!aCollapse)
			this.scrollToTabSubTree(aTab);

		this.doingCollapseExpand = false;
	},
 
	collapseExpandTab : function(aTab, aCollapse) 
	{
		if (!aTab) return;

		this.setTabValue(aTab, this.kCOLLAPSED, aCollapse);

		var b = this.mTabBrowser;
		var p;
		if (aCollapse && aTab == b.selectedTab && (p = this.getParentTab(aTab))) {
			b.selectedTab = p;
		}

		var isSubTreeCollapsed = (aTab.getAttribute(this.kSUBTREE_COLLAPSED) == 'true');
		var tabs = this.getChildTabs(aTab);
		for (var i = 0, maxi = tabs.length; i < maxi; i++)
		{
			if (!isSubTreeCollapsed)
				this.collapseExpandTab(tabs[i], aCollapse);
		}
	},
 
	collapseExpandTreesIntelligentlyFor : function(aTab) 
	{
		var b = this.mTabBrowser;
		if (this.doingCollapseExpand) return;

		var sameParentTab = this.getParentTab(aTab);
		var expandedParentTabs = [
				aTab.getAttribute(this.kID)
			];
		var parentTab = aTab;
		while (parentTab = this.getParentTab(parentTab))
		{
			expandedParentTabs.push(parentTab.getAttribute(this.kID));
		}
		expandedParentTabs = expandedParentTabs.join('|');

		var xpathResult = this.evaluateXPath(
				'child::xul:tab[@'+this.kCHILDREN+' and not(@'+this.kCOLLAPSED+'="true") and not(@'+this.kSUBTREE_COLLAPSED+'="true") and @'+this.kID+' and not(contains("'+expandedParentTabs+'", @'+this.kID+'))]',
				b.mTabContainer
			);
		var collapseTab;
		var dontCollapse;
		for (var i = 0, maxi = xpathResult.snapshotLength; i < maxi; i++)
		{
			dontCollapse = false;
			collapseTab  = xpathResult.snapshotItem(i);

			parentTab = this.getParentTab(collapseTab);
			if (parentTab) {
				dontCollapse = true;
				if (parentTab.getAttribute(this.kSUBTREE_COLLAPSED) != 'true') {
					do {
						if (expandedParentTabs.indexOf(parentTab.getAttribute(this.kID)) < 0)
							continue;
						dontCollapse = false;
						break;
					}
					while (parentTab = this.getParentTab(parentTab));
				}
			}

			if (!dontCollapse)
				this.collapseExpandTabSubTree(collapseTab, true);
		}

		this.collapseExpandTabSubTree(aTab, false);
	},
  
/* scroll */ 
	
	scrollTo : function(aEndX, aEndY) 
	{
		if (this.getTreePref('tabbar.scroll.smooth')) {
			this.smoothScrollTo(aEndX, aEndY);
		}
		else {
			try {
				this.mTabBrowser.mTabstrip.scrollBoxObject.scrollTo(aEndX, aEndY);
			}
			catch(e) {
			}
		}
	},
	
	smoothScrollTo : function(aEndX, aEndY) 
	{
		var b = this.mTabBrowser;
		if (this.smoothScrollTimer) {
			window.clearInterval(this.smoothScrollTimer);
			this.smoothScrollTimer = null;
		}

		var scrollBoxObject = b.mTabContainer.mTabstrip.scrollBoxObject;
		var x = {}, y = {};
		scrollBoxObject.getPosition(x, y);
		this.smoothScrollTimer = window.setInterval(
			this.smoothScrollToCallback,
			10,
			this,
			x.value,
			y.value,
			aEndX,
			aEndY,
			Date.now(),
			this.getTreePref('tabbar.scroll.timeout')
		);
	},
 
	smoothScrollToCallback : function(aSelf, aStartX, aStartY, aEndX, aEndY, aStartTime, aTimeout) 
	{
		var newX = aStartX + parseInt(
				(aEndX - aStartX) * ((Date.now() - aStartTime) / aTimeout)
			);
		var newY = aStartY + parseInt(
				(aEndY - aStartY) * ((Date.now() - aStartTime) / aTimeout)
			);

		var scrollBoxObject = aSelf.mTabBrowser.mTabContainer.mTabstrip.scrollBoxObject;
		var x = {}, y = {};
		scrollBoxObject.getPosition(x, y);

		var w = {}, h = {};
		scrollBoxObject.getScrolledSize(w, h);
		var maxX = Math.max(0, w.value - scrollBoxObject.width);
		var maxY = Math.max(0, h.value - scrollBoxObject.height);

		if (
				(
				aEndX - aStartX > 0 ?
					x.value >= Math.min(aEndX, maxX) :
					x.value <= Math.min(aEndX, maxX)
				) &&
				(
				aEndY - aStartY > 0 ?
					y.value >= Math.min(aEndY, maxY) :
					y.value <= Math.min(aEndY, maxY)
				)
			) {
			if (aSelf.smoothScrollTimer) {
				window.clearInterval(aSelf.smoothScrollTimer);
				aSelf.smoothScrollTimer = null;
			}
			return;
		}

		scrollBoxObject.scrollTo(newX, newY);
	},
  
	scrollToTab : function(aTab) 
	{
		if (!aTab || this.isTabInViewport(aTab)) return;

		var b = this.mTabBrowser;

		var scrollBoxObject = b.mTabContainer.mTabstrip.scrollBoxObject;
		var w = {}, h = {};
		try {
			scrollBoxObject.getScrolledSize(w, h);
		}
		catch(e) { // Tab Mix Plus
			return;
		}

		var targetTabBox = aTab.boxObject;
		var baseTabBox = aTab.parentNode.firstChild.boxObject;

		var targetX = (aTab.boxObject.screenX < scrollBoxObject.screenX) ?
			(targetTabBox.screenX - baseTabBox.screenX) - (targetTabBox.width * 0.5) :
			(targetTabBox.screenX - baseTabBox.screenX) - scrollBoxObject.width + (targetTabBox.width * 1.5) ;

		var targetY = (aTab.boxObject.screenY < scrollBoxObject.screenY) ?
			(targetTabBox.screenY - baseTabBox.screenY) - (targetTabBox.height * 0.5) :
			(targetTabBox.screenY - baseTabBox.screenY) - scrollBoxObject.height + (targetTabBox.height * 1.5) ;

		this.scrollTo(targetX, targetY);
	},
 
	scrollToTabSubTree : function(aTab) 
	{
		var b          = this.mTabBrowser;
		var descendant = this.getDescendantTabs(aTab);
		var lastVisible = aTab;
		for (var i = descendant.length-1; i > -1; i--)
		{
			if (descendant[i].getAttribute(this.kCOLLAPSED) == 'true') continue;
			lastVisible = descendant[i];
			break;
		}

		var containerPosition = b.mStrip.boxObject[this.positionProp];
		var containerSize     = b.mStrip.boxObject[this.sizeProp];
		var parentPosition    = aTab.boxObject[this.positionProp];
		var lastPosition      = lastVisible.boxObject[this.positionProp];
		var tabSize           = lastVisible.boxObject[this.sizeProp];

		if (this.isTabInViewport(aTab) && this.isTabInViewport(lastVisible)) {
			return;
		}

		if (lastPosition - parentPosition + tabSize > containerSize - tabSize) { // out of screen
			var endPos = parentPosition - b.mTabContainer.firstChild.boxObject[this.positionProp] - tabSize * 0.5;
			var endX = this.isVertical ? 0 : endPos ;
			var endY = this.isVertical ? endPos : 0 ;
			this.scrollTo(endX, endY);
		}
		else if (!this.isTabInViewport(aTab) && this.isTabInViewport(lastVisible)) {
			this.scrollToTab(aTab);
		}
		else if (this.isTabInViewport(aTab) && !this.isTabInViewport(lastVisible)) {
			this.scrollToTab(lastVisible);
		}
		else if (parentPosition < containerPosition) {
			this.scrollToTab(aTab);
		}
		else {
			this.scrollToTab(lastVisible);
		}
	},
   
/* Event Handling */ 
	
	domain : 'extensions.treestyletab', 
 
	observe : function(aSubject, aTopic, aData) 
	{
		var b = this.mTabBrowser;
		var self = this;
		switch (aTopic)
		{
			case 'TreeStyleTab:levelMarginModified':
				if (this.levelMargin > -1) {
					this.updateAllTabsIndent();
				}
				break;

			case 'nsPref:changed':
				var value = this.getPref(aData);
				var tabContainer = b.mTabContainer;
				var tabs  = Array.prototype.slice.call(tabContainer.childNodes);
				switch (aData)
				{
					case 'extensions.treestyletab.tabbar.position':
						if (value != 'left' && value != 'right') {
							this.endAutoHide();
						}
						this.initTabbar();
						tabs.forEach(function(aTab) {
							self.initTabAttributes(aTab);
						});
						this.updateAllTabsIndent();
						tabs.forEach(function(aTab) {
							self.initTabContents(aTab);
						});
						break;

					case 'extensions.treestyletab.tabbar.invertUI':
					case 'extensions.treestyletab.tabbar.multirow':
						this.initTabbar();
						this.updateAllTabsIndent();
						tabs.forEach(function(aTab) {
							self.initTabContents(aTab);
						});
						break;

					case 'extensions.treestyletab.enableSubtreeIndent':
						this.updateAllTabsIndent();
						break;

					case 'extensions.treestyletab.tabbar.style':
						b.setAttribute(this.kSTYLE, value);
						break;

					case 'extensions.treestyletab.showBorderForFirstTab':
						if (value)
							b.setAttribute(this.kFIRSTTAB_BORDER, true);
						else
							b.removeAttribute(this.kFIRSTTAB_BORDER);
						break;

					case 'extensions.treestyletab.tabbar.invertScrollbar':
						if (value &&
							this.mTabBrowser.getAttribute(this.kTABBAR_POSITION) == 'left' &&
							this.isGecko18)
							b.setAttribute(this.kSCROLLBAR_INVERTED, true);
						else
							b.removeAttribute(this.kSCROLLBAR_INVERTED);
						break;

					case 'extensions.treestyletab.tabbar.hideAlltabsButton':
						var pos = this.mTabBrowser.getAttribute(this.kTABBAR_POSITION);
						if (value && (pos == 'left' || pos == 'right'))
							b.setAttribute(this.kHIDE_ALLTABS, true);
						else
							b.removeAttribute(this.kHIDE_ALLTABS);
						break;

					case 'extensions.treestyletab.allowSubtreeCollapseExpand':
						if (value)
							b.setAttribute(this.kALLOW_COLLAPSE, true);
						else
							b.removeAttribute(this.kALLOW_COLLAPSE);
						break;

					case 'extensions.treestyletab.tabbar.autoHide.enabled':
						var pos = this.mTabBrowser.getAttribute(this.kTABBAR_POSITION);
						if (value && (pos == 'left' || pos == 'right'))
							this.startAutoHide();
						else
							this.endAutoHide();
						break;

					default:
						break;
				}
				break;

			default:
				break;
		}
	},
 
	handleEvent : function(aEvent) 
	{
		switch (aEvent.type)
		{
			case 'TabOpen':
				this.onTabAdded(aEvent);
				return;

			case 'TabClose':
				this.onTabRemoved(aEvent);
				return;

			case 'TabMove':
				this.onTabMove(aEvent);
				return;

			case 'SSTabRestoring':
				this.onTabRestored(aEvent);
				return;

			case 'select':
				this.onTabSelect(aEvent);
				return;

			case 'click':
				if (aEvent.target.ownerDocument == document) {
					this.onTabClick(aEvent);
					return;
				}
/*
				var isMiddleClick = (
					aEvent.button == 1 ||
					aEvent.button == 0 && (aEvent.ctrlKey || aEvent.metaKey)
					);
				var node = aEvent.originalTarget;
				while (node.parentNode && !node.href)
				{
					node = node.parentNode;
				}
				if (node.href && isMiddleClick) {
					this.readyToOpenChildTab(this.mTabBrowser.selectedTab);
				}
*/
				return;

			case 'dblclick':
				var tab = this.getTabFromEvent(aEvent);
				if (tab &&
					tab.getAttribute(this.kCHILDREN) &&
					this.getTreePref('collapseExpandSubTree.dblclick')) {
					this.collapseExpandTabSubTree(tab, tab.getAttribute(this.kSUBTREE_COLLAPSED) != 'true');
					aEvent.preventDefault();
					aEvent.stopPropagation();
				}
				return;

			case 'mousedown':
				if (aEvent.currentTarget == this.mTabBrowser.mTabContainer) {
					this.onTabMouseDown(aEvent);
				}
				else {
					if (aEvent.originalTarget.getAttribute('class') == this.kSPLITTER)
						this.tabbarResizing = true;
					this.cancelShowHideTabbar();
				}
				return;

			case 'mouseup':
				if (aEvent.originalTarget.getAttribute('class') == this.kSPLITTER)
					this.tabbarResizing = false;
				this.cancelShowHideTabbar();
				return;

			case 'mousemove':
				if (!this.tabbarResizing) {
					if (!this.tabContextMenuShown)
						this.showHideTabbar(aEvent);
					return;
				}
			case 'resize':
				if (this.tabbarShown) {
					switch (this.mTabBrowser.getAttribute(this.kTABBAR_POSITION))
					{
						case 'left':
							this.container.style.marginRight = '-'+this.tabbarWidth+'px';
							break;
						case 'right':
							this.container.style.marginLeft = '-'+this.tabbarWidth+'px';
							break;
						case 'bottom':
							this.container.style.marginTop = '-'+this.tabbarHeight+'px';
							break;
						default:
							this.container.style.marginBottom = '-'+this.tabbarHeight+'px';
							break;
					}
					this.redrawContentArea();
				}
				return;

			case 'scroll':
				this.redrawContentArea();
				return;

			case 'load':
				this.redrawContentArea();
				return;

			case 'popupshowing':
				if (aEvent.target != aEvent.currentTarget) return;
				this.tabContextMenuShown = true;
				this.initTabContextMenu(aEvent);
				return;

			case 'popuphiding':
				this.tabContextMenuShown = false;
				return;
		}
	},
 
	onTabAdded : function(aEvent) 
	{
		var tab = aEvent.originalTarget;
		var b   = this.mTabBrowser;

		this.initTab(tab);

		if (this.readyToAttachNewTab) {
			var parent = this.getTabById(this.parentTab);
			if (parent)
				this.attachTabTo(tab, parent);

			var refTab;
			var newIndex = -1;
			if (this.insertBefore &&
				(refTab = this.getTabById(this.insertBefore))) {
				newIndex = refTab._tPos;
			}
			else if (parent &&
				this.getTreePref('insertNewChildAt') == this.kINSERT_FISRT &&
				this.multipleCount == 0) {
				/* �����̎q�^�u����C�ɊJ���ꍇ�A�ŏ��ɊJ�����^�u������
				   �q�^�u�̍ŏ��̈ʒu�ɑ}�����A�����^�u�́u�ŏ��̊J�����^�u�v��
				   �u���X�ŏ��̎q�������^�u�v�Ƃ̊Ԃɑ}�����Ă��� */
				newIndex = parent._tPos + 1;
				if (refTab = this.getFirstChildTab(parent))
					this.insertBefore = refTab.getAttribute(this.kID);
			}

			if (newIndex > -1) {
				if (newIndex > tab._tPos) newIndex--;
				this.internallyTabMoving = true;
				b.moveTabTo(tab, newIndex);
				this.internallyTabMoving = false;
			}
		}

		if (!this.readyToAttachMultiple) {
			this.stopToOpenChildTab(b);
		}
		else {
			this.multipleCount++;
		}
	},
 
	onTabRemoved : function(aEvent) 
	{
		var tab = aEvent.originalTarget;
		var b   = this.mTabBrowser;

		this.destroyTab(tab);

		if (tab.getAttribute(this.kSUBTREE_COLLAPSED) == 'true') {
			var descendant = this.getDescendantTabs(tab);
			for (var i = descendant.length-1; i > -1; i--)
			{
				b.removeTab(descendant[i]);
			}

			if (b.mTabContainer.childNodes.length == 1) { // this is the last tab
				b.addTab('about:blank');
			}
		}

		var firstChild     = this.getFirstChildTab(tab);
		var parentTab      = this.getParentTab(tab);
		var nextFocusedTab = null;

		var next = this.getNextSiblingTab(tab);
		if (next)
			this.setTabValue(tab, this.kINSERT_BEFORE, next.getAttribute(this.kID));

		if (firstChild) {
			var backupChildren = this.getTabValue(tab, this.kCHILDREN);
			var children   = this.getChildTabs(tab);
			var self       = this;
			var attach     = this.getTreePref('attachChildrenToGrandParentOnRemoveTab');
			var processTab = !attach ? function(aTab) {
					self.partTab(aTab, true);
					self.moveTabSubTreeTo(aTab, b.mTabContainer.lastChild._tPos);
				} :
				parentTab ? function(aTab) {
					self.attachTabTo(aTab, parentTab, {
						insertBefore : tab,
						dontUpdateIndent : true,
						dontExpand : true
					});
				} :
				function(aTab) {
					self.partTab(aTab, true);
				};
			for (var i = 0, maxi = children.length; i < maxi; i++)
			{
				processTab(children[i]);
			}
			this.updateTabsIndent(children);
			this.checkTabsIndentOverflow();
			if (attach) {
				nextFocusedTab = firstChild;
			}
			this.setTabValue(tab, this.kCHILDREN, backupChildren);
		}

		if (parentTab) {
			var firstSibling = this.getFirstChildTab(parentTab);
			var lastSibling  = this.getLastChildTab(parentTab);
			if (tab == lastSibling) {
				if (tab == firstSibling) { // there is only one child
					nextFocusedTab = parentTab;
				}
				else { // previous sibling tab
					nextFocusedTab = this.getPreviousSiblingTab(tab);
				}
			}
			this.partTab(tab, true);
		}
		else if (!nextFocusedTab) {
			nextFocusedTab = this.getNextSiblingTab(tab);
		}

		if (nextFocusedTab && b.selectedTab == tab)
			b.selectedTab = nextFocusedTab;

		this.checkTabsIndentOverflow();
	},
 
	onTabMove : function(aEvent) 
	{
		var tab = aEvent.originalTarget;
		var b   = this.mTabBrowser;
		this.initTabContents(tab); // twisty vanished after the tab is moved!!

		var rebuildTreeDone = false;

		if (tab.getAttribute(this.kCHILDREN) && !this.isSubTreeMoving) {
			this.moveTabSubTreeTo(tab, tab._tPos);
			rebuildTreeDone = true;
		}

		var parentTab = this.getParentTab(tab);
		if (parentTab && !this.isSubTreeChildrenMoving) {
			this.updateChildrenArray(parentTab);
		}

		if (
			rebuildTreeDone ||
			this.isSubTreeMoving ||
			this.internallyTabMoving
			)
			return;

		var nest       = Number(tab.getAttribute(this.kNEST) || 0);
		var parent     = this.getParentTab(tab);
		var prevParent = this.getParentTab(tab.previousSibling);
		var nextParent = this.getParentTab(tab.nextSibling);
		var prevNest   = tab.previousSibling ? Number(tab.previousSibling.getAttribute(this.kNEST)) : -1 ;
		var nextNest   = tab.nextSibling ? Number(tab.nextSibling.getAttribute(this.kNEST)) : -1 ;

		if (
			!tab.previousSibling || !tab.nextSibling ||
			prevParent == nextParent ||
			prevNest > nextNest
			) {
			if (prevParent)
				this.attachTabTo(tab, prevParent, { insertBefore : tab.nextSibling });
			else
				this.partTab(tab);
		}
		else if (prevNest < nextNest) {
			this.attachTabTo(tab, tab.previousSibling, { insertBefore : tab.nextSibling });
		}
	},
	
	updateChildrenArray : function(aTab) 
	{
		var children = this.getChildTabs(aTab);
		children.sort(function(aA, aB) { return aA._tPos - aB._tPos; });
		var self = this;
		this.setTabValue(aTab, this.kCHILDREN,
			children.map(function(aItem) { return aItem.getAttribute(self.kID); }).join('|'));
	},
  
	onTabRestored : function(aEvent) 
	{
		var tab = aEvent.originalTarget;
		var b   = this.mTabBrowser;
		var id  = this.getTabValue(tab, this.kID);
		this.setTabValue(tab, this.kID, id);

		var isSubTreeCollapsed = (this.getTabValue(tab, this.kSUBTREE_COLLAPSED) == 'true');

		var children = this.getTabValue(tab, this.kCHILDREN);
		if (children) {
			children = children.split('|');
			var tabs = [];
			for (var i = 0, maxi = children.length; i < maxi; i++)
			{
				if (children[i] && (children[i] = this.getTabById(children[i]))) {
					this.attachTabTo(children[i], tab, { dontExpand : true, dontUpdateIndent : true });
					tabs.push(children[i]);
				}
			}
		}

		var parent = this.getTabValue(tab, this.kPARENT);
		var before = this.getTabValue(tab, this.kINSERT_BEFORE);
		if (parent) {
			parent = this.getTabById(parent);
			if (parent) {
				this.attachTabTo(tab, parent, {
					dontExpand : true,
					insertBefore : (before ? this.getTabById(before) : null ),
					dontUpdateIndent : true
				});
				this.updateTabsIndent([tab]);
				this.checkTabsIndentOverflow();
			}
			else {
				this.deleteTabValue(tab, this.kPARENT);
			}
		}
		else if (children) {
			this.updateTabsIndent(tabs);
			this.checkTabsIndentOverflow();
		}

		if (!parent && (before = this.getTabById(before))) {
			var index = before._tPos;
			if (index > tab._tPos) index--;
			this.internallyTabMoving = true;
			b.moveTabTo(tab, index);
			this.internallyTabMoving = false;
		}
		this.deleteTabValue(tab, this.kINSERT_BEFORE);

		if (isSubTreeCollapsed) {
			this.collapseExpandTabSubTree(tab, isSubTreeCollapsed);
		}
	},
 
	onTabSelect : function(aEvent) 
	{
		var b   = this.mTabBrowser;
		var tab = b.selectedTab

/*
		var p;
		if ((tab.getAttribute(this.kCOLLAPSED) == 'true') &&
			(p = this.getParentTab(tab))) {
			b.selectedTab = p;
		}
*/
		if (tab.getAttribute(this.kCOLLAPSED) == 'true') {
			var parentTab = tab;
			while (parentTab = this.getParentTab(parentTab))
			{
				this.collapseExpandTabSubTree(parentTab, false);
			}
		}
		else if (tab.getAttribute(this.kCHILDREN) &&
				(tab.getAttribute(this.kSUBTREE_COLLAPSED) == 'true') &&
				this.getTreePref('autoCollapseExpandSubTreeOnSelect')) {
			this.collapseExpandTreesIntelligentlyFor(tab);
		}

		if (this.autoHideEnabled && this.tabbarShown)
			this.redrawContentArea();
	},
 
	onTabClick : function(aEvent) 
	{
		if (aEvent.button != 0 ||
			!this.isEventFiredOnTwisty(aEvent))
			return;

		var tab = this.getTabFromEvent(aEvent);
		this.collapseExpandTabSubTree(tab, tab.getAttribute(this.kSUBTREE_COLLAPSED) != 'true');

		aEvent.preventDefault();
		aEvent.stopPropagation();
	},
 
	onTabMouseDown : function(aEvent) 
	{
		if (aEvent.button != 0 ||
			!this.isEventFiredOnTwisty(aEvent))
			return;

		this.getTabFromEvent(aEvent).__treestyletab__preventSelect = true;
	},
 
	initTabContextMenu : function(aEvent) 
	{
		var b = this.mTabBrowser;
		var item = this.evaluateXPath(
			'descendant::xul:menuitem[starts-with(@id, "'+this.kMENUITEM_REMOVESUBTREE_CONTEXT+'")]',
			aEvent.currentTarget,
			XPathResult.FIRST_ORDERED_NODE_TYPE
		).singleNodeValue;
		if (this.getTreePref('show.context-item-removeTabSubTree'))
			item.removeAttribute('hidden');
		else
			item.setAttribute('hidden', true);
		this.showHideRemoveSubTreeMenuItem(item, [b.mContextTab]);

		item = this.evaluateXPath(
			'descendant::xul:menuitem[starts-with(@id, "'+this.kMENUITEM_AUTOHIDE_CONTEXT+'")]',
			aEvent.currentTarget,
			XPathResult.FIRST_ORDERED_NODE_TYPE
		).singleNodeValue;
		var sep = this.evaluateXPath(
			'descendant::xul:menuseparator[starts-with(@id, "'+this.kMENUITEM_AUTOHIDE_SEPARATOR_CONTEXT+'")]',
			aEvent.currentTarget,
			XPathResult.FIRST_ORDERED_NODE_TYPE
		).singleNodeValue;
		var pos = b.getAttribute(this.kTABBAR_POSITION);
		if (this.getTreePref('show.context-item-toggleAutoHide') &&
			(pos == 'left' || pos == 'right')) {
			item.removeAttribute('hidden');
			sep.removeAttribute('hidden');

			if (this.getTreePref('tabbar.autoHide.enabled'))
				item.setAttribute('checked', true);
			else
				item.removeAttribute('checked');
		}
		else {
			item.setAttribute('hidden', true);
			sep.setAttribute('hidden', true);
		}
	},
 
	getDropAction : function(aEvent, aDragSession) 
	{
		var info = this.getDropActionInternal(aEvent);
		info.canDrop = true;
		if (info.action & this.kACTION_ATTACH &&
			aDragSession &&
			aDragSession.sourceNode &&
			aDragSession.sourceNode.localName == 'tab') {
			var orig = aDragSession.sourceNode;
			if (orig == info.parent) {
				info.canDrop = false;
			}
			else {
				var tab  = info.target;
				while (tab = this.getParentTab(tab))
				{
					if (tab != orig) continue;
					info.canDrop = false;
					break;
				}
			}
		}
		return info;
	},
	
	getDropActionInternal : function(aEvent) 
	{
		var tab        = aEvent.target;
		var b          = this.mTabBrowser;
		var tabs       = b.mTabContainer.childNodes;
		var isInverted = this.isVertical ? false : window.getComputedStyle(b.parentNode, null).direction == 'rtl';
		var info       = {
				target       : null,
				position     : null,
				action       : null,
				parent       : null,
				insertBefore : null
			};

		if (tab.localName != 'tab') {
			if (aEvent[this.positionProp] < tabs[0].boxObject[this.positionProp]) {
				info.target   = info.parent = info.insertBefore = tabs[0];
				info.position = isInverted ? this.kDROP_AFTER : this.kDROP_BEFORE ;
				info.action   = this.kACTION_MOVE | this.kACTION_PART;
				return info;
			}
			else if (aEvent[this.positionProp] > tabs[tabs.length-1].boxObject[this.positionProp] + tabs[tabs.length-1].boxObject[this.sizeProp]) {
				info.target   = info.parent = tabs[tabs.length-1];
				info.position = isInverted ? this.kDROP_BEFORE : this.kDROP_AFTER ;
				info.action   = this.kACTION_MOVE | this.kACTION_PART;
				return info;
			}
			else {
				info.target = tabs[Math.min(b.getNewIndex(aEvent), tabs.length - 1)];
			}
		}
		else {
			info.target = tab;
		}

		var boxPos  = tab.boxObject[this.positionProp];
		var boxUnit = Math.round(tab.boxObject[this.sizeProp] / 3);
		if (aEvent[this.positionProp] < boxPos + boxUnit) {
			info.position = isInverted ? this.kDROP_AFTER : this.kDROP_BEFORE ;
		}
		else if (aEvent[this.positionProp] > boxPos + boxUnit + boxUnit) {
			info.position = isInverted ? this.kDROP_BEFORE : this.kDROP_AFTER ;
		}
		else {
			info.position = this.kDROP_ON;
		}

		switch (info.position)
		{
			case this.kDROP_ON:
				info.action       = this.kACTION_ATTACH;
				info.parent       = tab;
				info.insertBefore = this.getNextVisibleTab(tab);
				break;

			case this.kDROP_BEFORE:
/*
	[TARGET  ] ��part from parent, and move

	  [      ]
	[TARGET  ] ��attach to the parent of the target, and move

	[        ]
	[TARGET  ] ��attach to the parent of the target, and move

	[        ]
	  [TARGET] ��attach to the parent of the target (previous tab), and move
*/
				var prevTab = this.getPreviousVisibleTab(tab);
				if (!prevTab) {
					info.action       = this.kACTION_MOVE | this.kACTION_PART;
					info.insertBefore = tabs[0];
				}
				else {
					var prevNest   = Number(prevTab.getAttribute(this.kNEST));
					var targetNest = Number(tab.getAttribute(this.kNEST));
					info.parent       = (prevNest < targetNest) ? prevTab : this.getParentTab(tab) ;
					info.action       = this.kACTION_MOVE | (info.parent ? this.kACTION_ATTACH : this.kACTION_PART );
					info.insertBefore = tab;
				}
				break;

			case this.kDROP_AFTER:
/*
	[TARGET  ] ��if the target has a parent, attach to it and and move

	  [TARGET] ��attach to the parent of the target, and move
	[        ]

	[TARGET  ] ��attach to the parent of the target, and move
	[        ]

	[TARGET  ] ��attach to the target, and move
	  [      ]
*/
				var nextTab = this.getNextVisibleTab(tab);
				if (!nextTab) {
					info.action = this.kACTION_MOVE | this.kACTION_ATTACH;
					info.parent = this.getParentTab(tab);
				}
				else {
					var targetNest = Number(tab.getAttribute(this.kNEST));
					var nextNest   = Number(nextTab.getAttribute(this.kNEST));
					info.parent       = (targetNest < nextNest) ? tab : this.getParentTab(tab) ;
					info.action       = this.kACTION_MOVE | (info.parent ? this.kACTION_ATTACH : this.kACTION_PART );
					info.insertBefore = nextTab;
				}
				break;
		}

		return info;
	},
  
	processDropAction : function(aInfo, aTarget) 
	{
		var b    = this.mTabBrowser;
		var tabs = b.mTabContainer.childNodes;
		if (aTarget && aInfo.action & this.kACTION_PART) {
			this.partTab(aTarget);
		}
		else if (aInfo.action & this.kACTION_ATTACH) {
			if (aInfo.parent)
				this.attachTabTo(aTarget, aInfo.parent);
			else
				this.partTab(aTarget);
		}
		else {
			return false;
		}

		if (
			aInfo.action & this.kACTION_MOVE &&
			(
				!aInfo.insertBefore ||
				this.getNextVisibleTab(aTarget) != aInfo.insertBefore
			)
			) {
			var newIndex = aInfo.insertBefore ? aInfo.insertBefore._tPos : tabs.length - 1 ;
			if (aInfo.insertBefore && newIndex > aTarget._tPos) newIndex--;
			this.internallyTabMoving = true;
			b.moveTabTo(aTarget,  newIndex);
			this.internallyTabMoving = false;
		}
		return true;
	},
 
	clearDropPosition : function() 
	{
		var b = this.mTabBrowser;
		var xpathResult = this.evaluateXPath(
				'child::xul:tab[@'+this.kDROP_POSITION+']',
				b.mTabContainer
			);
		for (var i = 0, maxi = xpathResult.snapshotLength; i < maxi; i++)
		{
			xpathResult.snapshotItem(i).removeAttribute(this.kDROP_POSITION);
		}
	},
  
/* auto hide */ 
	autoHideEnabled : false,
	tabbarShown : true,
	
	get tabbarWidth() 
	{
		if (this.tabbarShown) {
			var b = this.mTabBrowser;
			var splitter = document.getAnonymousElementByAttribute(b, 'class', this.kSPLITTER);
			this._tabbarWidth = b.mStrip.boxObject.width +
				(splitter ? splitter.boxObject.width : 0 );
		}
		return this._tabbarWidth;
	},
	set tabbarWidth(aNewWidth)
	{
		this._tabbarWidth = aNewWidth;
		return this._tabbarWidth;
	},
	_tabbarWidth : 0,
 
	get tabbarHeight() 
	{
		if (this.tabbarShown) {
			var b = this.mTabBrowser;
			this._tabbarHeight = b.mStrip.boxObject.height;
		}
		return this._tabbarHeight;
	},
	set tabbarHeight(aNewHeight)
	{
		this._tabbarHeight = aNewHeight;
		return this._tabbarHeight;
	},
	_tabbarHeight : 0,
 
	get areaPadding() 
	{
		return this.getTreePref('tabbar.autoHide.area');
	},
 
	startAutoHide : function() 
	{
		if (this.autoHideEnabled) return;
		this.autoHideEnabled = true;

		this.mTabBrowser.addEventListener('mousedown', this, true);
		this.mTabBrowser.addEventListener('mouseup', this, true);
		this.mTabBrowser.addEventListener('mousemove', this, true);
		this.mTabBrowser.addEventListener('scroll', this, true);
		this.mTabBrowser.addEventListener('resize', this, true);
		this.mTabBrowser.addEventListener('load', this, true);

		this.tabbarShown = true;
		this.showHideTabbarInternal();
	},
 
	endAutoHide : function() 
	{
		if (!this.autoHideEnabled) return;
		this.autoHideEnabled = false;

		this.mTabBrowser.removeEventListener('mousedown', this, true);
		this.mTabBrowser.removeEventListener('mouseup', this, true);
		this.mTabBrowser.removeEventListener('mousemove', this, true);
		this.mTabBrowser.removeEventListener('scroll', this, true);
		this.mTabBrowser.removeEventListener('resize', this, true);
		this.mTabBrowser.removeEventListener('load', this, true);

		this.container.style.margin = 0;
		this.mTabBrowser.removeAttribute(this.kAUTOHIDE);
		this.tabbarShown = true;
	},
 
	showHideTabbar : function(aEvent) 
	{
		if ('gestureInProgress' in window && window.gestureInProgress) return;

		this.cancelShowHideTabbar();

		var b      = this.mTabBrowser;
		var pos    = b.getAttribute(this.kTABBAR_POSITION);
		var expand = this.getTreePref('tabbar.autoHide.expandArea');
		if (!this.tabbarShown &&
			(
				pos == 'left' ?
					(aEvent.screenX <= b.boxObject.screenX + (expand ? this.tabbarWidth : 0 ) + this.areaPadding) :
				pos == 'right' ?
					(aEvent.screenX >= b.boxObject.screenX + b.boxObject.width - (expand ? this.tabbarWidth : 0 ) - this.areaPadding) :
				pos == 'bottom' ?
					(aEvent.screenY >= b.boxObject.screenY + b.boxObject.height - (expand ? this.tabbarHeight : 0 ) - this.areaPadding) :
					(aEvent.screenY <= b.boxObject.screenY + (expand ? this.tabbarHeight : 0 ) + this.areaPadding)
				))
				this.showHideTabbarTimer = window.setTimeout(
					function(aSelf) { aSelf.showHideTabbarInternal(); },
					this.getTreePref('tabbar.autoHide.delay'),
					this
				);

		if (this.tabbarShown &&
			(
				pos == 'left' ?
					(aEvent.screenX > b.mCurrentBrowser.boxObject.screenX + this.areaPadding) :
				pos == 'right' ?
					(aEvent.screenX < b.mCurrentBrowser.boxObject.screenX + b.mCurrentBrowser.boxObject.width - this.areaPadding) :
				pos == 'bottom' ?
					(aEvent.screenY < b.mCurrentBrowser.boxObject.screenY + b.mCurrentBrowser.boxObject.height - this.areaPadding) :
					(aEvent.screenY > b.mCurrentBrowser.boxObject.screenY + this.areaPadding)
				))
				this.showHideTabbarTimer = window.setTimeout(
					function(aSelf) { aSelf.showHideTabbarInternal(); },
					this.getTreePref('tabbar.autoHide.delay'),
					this
				);
	},
	showHideTabbarTimer : null,
	
	showHideTabbarInternal : function() 
	{
		var b = this.mTabBrowser;
		if (this.tabbarShown) {
			var splitter = document.getAnonymousElementByAttribute(b, 'class', this.kSPLITTER);
			this.tabbarHeight = b.mStrip.boxObject.height;
			this.tabbarWidth = b.mStrip.boxObject.width +
				(splitter ? splitter.boxObject.width : 0 );
			this.container.style.margin = 0;
			b.setAttribute(this.kAUTOHIDE, true);
			this.tabbarShown = false;
		}
		else {
			switch (b.getAttribute(this.kTABBAR_POSITION))
			{
				case 'left':
					this.container.style.marginRight = '-'+this.tabbarWidth+'px';
					break;
				case 'right':
					this.container.style.marginLeft = '-'+this.tabbarWidth+'px';
					break;
				case 'bottom':
					this.container.style.marginTop = '-'+this.tabbarHeight+'px';
					break;
				default:
					this.container.style.marginBottom = '-'+this.tabbarHeight+'px';
					break;
			}
			b.removeAttribute(this.kAUTOHIDE);
			this.tabbarShown = true;
		}
		this.redrawContentArea();
		window.setTimeout(function() { b.treeStyleTab.checkTabsIndentOverflow(); }, 0);
	},
 
	cancelShowHideTabbar : function() 
	{
		if (this.showHideTabbarTimer) {
			window.clearTimeout(this.showHideTabbarTimer);
			this.showHideTabbarTimer = null;
		}
	},
  
	redrawContentArea : function() 
	{
		var pos = this.mTabBrowser.getAttribute(this.kTABBAR_POSITION);
		try {
			var v = this.mTabBrowser.markupDocumentViewer;
			if (this.tabbarShown) {
				v.move(
					(
						!this.tabbarShown ? 0 :
						pos == 'left' ? -this.tabbarWidth :
						pos == 'right' ? this.tabbarWidth :
						0
					),
					(
						!this.tabbarShown ? 0 :
						pos == 'top' ? -this.tabbarHeight :
						pos == 'bottom' ? this.tabbarHeight :
						0
					)
				);
			}
			else {
				v.move(window.outerWidth,window.outerHeight);
				v.move(0,0);
			}
		}
		catch(e) {
		}
	},
  
	init : function() 
	{
		var b = this.mTabBrowser;

		this.initTabbar();

		b.addEventListener('TabOpen',        this, true);
		b.addEventListener('TabClose',       this, true);
		b.addEventListener('TabMove',        this, true);
		b.addEventListener('SSTabRestoring', this, true);
		b.mTabContainer.addEventListener('click', this, true);
		b.mTabContainer.addEventListener('dblclick', this, true);
		b.mTabContainer.addEventListener('mousedown', this, true);
		b.mTabContainer.addEventListener('select', this, true);

		var selectNewTab = '_selectNewTab' in b.mTabContainer ? '_selectNewTab' : 'selectNewTab' ; // Fx3 / Fx2

		eval('b.mTabContainer.'+selectNewTab+' = '+
			b.mTabContainer[selectNewTab].toSource().replace(
				'{',
				<><![CDATA[
					{
						if (arguments[0].__treestyletab__preventSelect) {
							arguments[0].__treestyletab__preventSelect = false;
							return;
						}
				]]></>
			)
		);

		eval('b.mTabContainer.advanceSelectedTab = '+
			b.mTabContainer.advanceSelectedTab.toSource().replace(
				'{',
				<><![CDATA[
					{
						if (TreeStyleTabService.getTreePref('focusMode') == TreeStyleTabService.kFOCUS_VISIBLE) {
							(function(aDir, aWrap, aSelf) {
								var treeStyleTab = TreeStyleTabService.getTabBrowserFromChildren(aSelf).treeStyleTab;
								var nextTab = (aDir < 0) ? treeStyleTab.getPreviousVisibleTab(aSelf.selectedItem) : treeStyleTab.getNextVisibleTab(aSelf.selectedItem) ;
								if (!nextTab && aWrap) {
									var xpathResult = TreeStyleTabService.evaluateXPath(
											'child::xul:tab[not(@'+TreeStyleTabService.kCOLLAPSED+'="true")]',
											aSelf
										);
									nextTab = xpathResult.snapshotItem(aDir < 0 ? xpathResult.snapshotLength-1 : 0 );
								}
								if (nextTab && nextTab != aSelf.selectedItem) {
									if ('_selectNewTab' in aSelf)
										aSelf._selectNewTab(nextTab, aDir, aWrap); // Fx 3
									else
										aSelf.selectNewTab(nextTab, aDir, aWrap); // Fx 2
								}
							})(arguments[0], arguments[1], this);
							return;
						}
				]]></>
			)
		);

		eval('b.mTabContainer._handleTabSelect = '+
			b.mTabContainer._handleTabSelect.toSource().replace(
				'{',
				<><![CDATA[
					{
						var treeStyleTab = TreeStyleTabService.getTabBrowserFromChildren(this).treeStyleTab;
						if (!treeStyleTab.isTabInViewport(this.selectedItem)) {
							treeStyleTab.scrollToTab(this.selectedItem);
							return;
						}
				]]></>
			)
		);

		eval('b.mTabContainer._notifyBackgroundTab = '+
			b.mTabContainer._notifyBackgroundTab.toSource().replace(
				'{',
				'{ var treeStyleTab = TreeStyleTabService.getTabBrowserFromChildren(this).treeStyleTab;'
			).replace(
				/\.screenX/g, '[treeStyleTab.positionProp]'
			).replace(
				/\.width/g, '[treeStyleTab.sizeProp]'
			)
		);

		this.updateTabDNDObserver(b);

		eval('b.getNewIndex = '+
			b.getNewIndex.toSource().replace(
				/\.screenX/g, '[this.treeStyleTab.positionProp]'
			).replace(
				/\.width/g, '[this.treeStyleTab.sizeProp]'
			)
		);

		eval('b.moveTabForward = '+
			b.moveTabForward.toSource().replace(
				'{', '{ var nextTab;'
			).replace(
				'tabPos < this.browsers.length - 1',
				'nextTab = this.treeStyleTab.getNextSiblingTab(this.mCurrentTab)'
			).replace(
				'tabPos + 1', 'nextTab._tPos'
			).replace(
				'this.moveTabTo(',
				<><![CDATA[
					var descendant = this.treeStyleTab.getDescendantTabs(nextTab);
					if (descendant.length) {
						nextTab = descendant[descendant.length-1];
					}
					this.moveTabTo(]]></>
			).replace(
				'this.moveTabToStart();',
				<><![CDATA[
					this.treeStyleTab.internallyTabMoving = true;
					var parentTab = this.treeStyleTab.getParentTab(this.mCurrentTab);
					if (parentTab) {
						this.moveTabTo(this.mCurrentTab, this.treeStyleTab.getFirstChildTab(parentTab)._tPos);
						this.mCurrentTab.focus();
					}
					else {
						this.moveTabToStart();
					}
					this.treeStyleTab.internallyTabMoving = false;
				]]></>
			)
		);

		eval('b.moveTabBackward = '+
			b.moveTabBackward.toSource().replace(
				'{', '{ var prevTab;'
			).replace(
				'tabPos > 0',
				'prevTab = this.treeStyleTab.getPreviousSiblingTab(this.mCurrentTab)'
			).replace(
				'tabPos - 1', 'prevTab._tPos'
			).replace(
				'this.moveTabToEnd();',
				<><![CDATA[
					this.treeStyleTab.internallyTabMoving = true;
					var parentTab = this.treeStyleTab.getParentTab(this.mCurrentTab);
					if (parentTab) {
						this.moveTabTo(this.mCurrentTab, this.treeStyleTab.getLastChildTab(parentTab)._tPos);
						this.mCurrentTab.focus();
					}
					else {
						this.moveTabToEnd();
					}
					this.treeStyleTab.internallyTabMoving = false;
				]]></>
			)
		);

		eval('b._keyEventHandler.handleEvent = '+
			b._keyEventHandler.handleEvent.toSource().replace(
				'this.tabbrowser.moveTabOver(aEvent);',
				<><![CDATA[
					if (!this.tabbrowser.treeStyleTab.isVertical ||
						!this.tabbrowser.treeStyleTab.moveTabLevel(aEvent)) {
						this.tabbrowser.moveTabOver(aEvent);
					}
				]]></>
			).replace(
				'this.tabbrowser.moveTabForward();',
				<><![CDATA[
					if (this.tabbrowser.treeStyleTab.isVertical ||
						!this.tabbrowser.treeStyleTab.moveTabLevel(aEvent)) {
						this.tabbrowser.moveTabForward();
					}
				]]></>
			).replace(
				'this.tabbrowser.moveTabBackward();',
				<><![CDATA[
					if (this.tabbrowser.treeStyleTab.isVertical ||
						!this.tabbrowser.treeStyleTab.moveTabLevel(aEvent)) {
						this.tabbrowser.moveTabBackward();
					}
				]]></>
			)
		);

		eval('b.loadTabs = '+
			b.loadTabs.toSource().replace(
				'var tabNum = ',
				<><![CDATA[
					if (this.treeStyleTab.readyToAttachNewTabGroup)
						TreeStyleTabService.readyToOpenChildTab(firstTabAdded || this.selectedTab, true);
					var tabNum = ]]></>
			).replace(
				'if (!aLoadInBackground)',
				<><![CDATA[
					if (TreeStyleTabService.checkToOpenChildTab(this))
						TreeStyleTabService.stopToOpenChildTab(this);
					if (!aLoadInBackground)]]></>
			)
		);

		var tabs = b.mTabContainer.childNodes;
		for (var i = 0, maxi = tabs.length; i < maxi; i++)
		{
			this.initTab(tabs[i]);
		}

		this.observe(null, 'nsPref:changed', 'extensions.treestyletab.tabbar.style');
		this.observe(null, 'nsPref:changed', 'extensions.treestyletab.showBorderForFirstTab');
		this.observe(null, 'nsPref:changed', 'extensions.treestyletab.tabbar.invertScrollbar');
		this.observe(null, 'nsPref:changed', 'extensions.treestyletab.tabbar.hideAlltabsButton');
		this.observe(null, 'nsPref:changed', 'extensions.treestyletab.allowSubtreeCollapseExpand');
		window.setTimeout(function() {
			b.treeStyleTab.observe(null, 'nsPref:changed', 'extensions.treestyletab.tabbar.autoHide.enabled');
		}, 0);

		delete i;
		delete maxi;
		delete tabs;

		var tabContext = document.getAnonymousElementByAttribute(b, 'anonid', 'tabContextMenu');
		tabContext.addEventListener('popupshowing', this, false);
		tabContext.addEventListener('popuphiding', this, false);
		window.setTimeout(function(sv) {
			var suffix = '-'+parseInt(Math.random() * 65000);
			var item = document.getElementById(sv.kMENUITEM_REMOVESUBTREE_CONTEXT).cloneNode(true);
			item.setAttribute('id', item.getAttribute('id')+suffix);
			tabContext.appendChild(item);

			item = document.getElementById(sv.kMENUITEM_AUTOHIDE_SEPARATOR_CONTEXT).cloneNode(true);
			item.setAttribute('id', item.getAttribute('id')+suffix);
			tabContext.appendChild(item);
			item = document.getElementById(sv.kMENUITEM_AUTOHIDE_CONTEXT).cloneNode(true);
			item.setAttribute('id', item.getAttribute('id')+suffix);
			tabContext.appendChild(item);
		}, 0, this);

		/* To move up content area on the tab bar, switch tab.
		   If we don't do it, a gray space appears on the content area
		   by negative margin of it. */
		if (b.getAttribute(this.kTABBAR_POSITION) == 'left' &&
			b.getAttribute(this.kSCROLLBAR_INVERTED) == 'true') {
			b.removeTab(
				b.selectedTab = b.addTab('about:blank')
			);
		}

		this.ObserverService.addObserver(this, 'TreeStyleTab:levelMarginModified', false);
		this.addPrefListener(this);
	},
	
	initTab : function(aTab) 
	{
		if (!aTab.hasAttribute(this.kID)) {
			var id = 'tab-<'+Date.now()+'-'+parseInt(Math.random() * 65000)+'>';
			this.setTabValue(aTab, this.kID, id);
		}

		aTab.__treestyletab__linkedTabBrowser = this.mTabBrowser;

		this.initTabAttributes(aTab);
		this.initTabContents(aTab);

		aTab.setAttribute(this.kNEST, 0);
	},
	
	initTabAttributes : function(aTab) 
	{
		var pos = this.mTabBrowser.getAttribute(this.kTABBAR_POSITION);
		if (pos == 'left' || pos == 'right') {
			aTab.setAttribute('align', 'stretch');
			aTab.removeAttribute('maxwidth');
			aTab.removeAttribute('minwidth');
			aTab.removeAttribute('width');
			aTab.removeAttribute('flex');
			aTab.maxWidth = 65000;
			aTab.minWidth = 0;
			aTab.setAttribute('dir', 'ltr'); // Tab Mix Plus
		}
		else {
			aTab.removeAttribute('align');
			aTab.setAttribute('maxwidth', 250);
			aTab.setAttribute('minwidth', this.mTabBrowser.mTabContainer.mTabMinWidth);
			aTab.setAttribute('width', '0');
			aTab.setAttribute('flex', 100);
			aTab.maxWidth = 250;
			aTab.minWidth = this.mTabBrowser.mTabContainer.mTabMinWidth;
			aTab.removeAttribute('dir'); // Tab Mix Plus
		}
	},
 
	initTabContents : function(aTab) 
	{
		var icon  = document.getAnonymousElementByAttribute(aTab, 'class', 'tab-icon');
		var label = this.getTabLabel(aTab);
		var close = this.getTabClosebox(aTab);
		var counter = document.getAnonymousElementByAttribute(aTab, 'class', this.kCOUNTER_CONTAINER);

		if (!document.getAnonymousElementByAttribute(aTab, 'class', this.kTWISTY)) {
			var twisty = document.createElement('image');
			twisty.setAttribute('class', this.kTWISTY);
			var container = document.createElement('hbox');
			container.setAttribute('class', this.kTWISTY_CONTAINER);
			container.appendChild(twisty);

			icon.appendChild(container);

			var marker = document.createElement('image');
			marker.setAttribute('class', this.kDROP_MARKER);
			container = document.createElement('hbox');
			container.setAttribute('class', this.kDROP_MARKER_CONTAINER);
			container.appendChild(marker);

			icon.appendChild(container);
		}

		if (!counter) {
			var counter = document.createElement('hbox');
			counter.setAttribute('class', this.kCOUNTER_CONTAINER);

			counter.appendChild(document.createElement('label'));
			counter.lastChild.setAttribute('class', this.kCOUNTER);
			counter.lastChild.setAttribute('value', '(0)');

			if (label) {
				if (label.nextSibling)
					label.parentNode.insertBefore(counter, label.nextSibling);
				else
					label.parentNode.appendChild(counter);
			}
		}
		this.initTabContentsOrder(aTab);
	},
 
	initTabContentsOrder : function(aTab) 
	{
		var label = this.getTabLabel(aTab);
		var close = this.getTabClosebox(aTab);
		var counter = document.getAnonymousElementByAttribute(aTab, 'class', this.kCOUNTER_CONTAINER);

		var nodes = document.getAnonymousNodes(aTab);
		for (var i = nodes.length-1; i > -1; i--)
		{
			nodes[i].setAttribute('ordinal', (i + 1) * 10);
		}

		nodes = label.parentNode.childNodes;
		if (this.mTabBrowser.getAttribute(this.kTABBAR_POSITION) == 'right' &&
			this.mTabBrowser.getAttribute(this.kUI_INVERTED) == 'true') {
			for (var i = nodes.length-1; i > -1; i--)
			{
				if (nodes[i].getAttribute('class') == 'informationaltab-thumbnail-container')
					continue;
				nodes[i].setAttribute('ordinal', (nodes.length - i + 1) * 10);
			}
			counter.setAttribute('ordinal', parseInt(label.getAttribute('ordinal')) + 1);
			close.setAttribute('ordinal', parseInt(label.parentNode.getAttribute('ordinal')) - 5);
		}
		else {
			for (var i = nodes.length-1; i > -1; i--)
			{
				if (nodes[i].getAttribute('class') == 'informationaltab-thumbnail-container')
					continue;
				nodes[i].setAttribute('ordinal', (i + 1) * 10);
			}
		}
	},
  
	initTabbar : function(aPosition) 
	{
		var b = this.mTabBrowser;

		if (!aPosition) aPosition = this.getTreePref('tabbar.position');
		aPosition = String(aPosition).toLowerCase();

		if (b.getAttribute('id') != 'content') {
			aPosition = 'top';
		}

		var pos = (aPosition == 'left') ? this.kTABBAR_LEFT :
			(aPosition == 'right') ? this.kTABBAR_RIGHT :
			(aPosition == 'bottom') ? this.kTABBAR_BOTTOM :
			this.kTABBAR_TOP;

		var splitter = document.getAnonymousElementByAttribute(b, 'class', this.kSPLITTER);
		if (!splitter) {
			splitter = document.createElement('splitter');
			splitter.setAttribute('class', this.kSPLITTER);
			splitter.setAttribute('onmouseup', 'TreeStyleTabService.onTabbarResized(event);');
			splitter.setAttribute('state', 'open');
			splitter.appendChild(document.createElement('grippy'));
			var ref = b.mPanelContainer;
			ref.parentNode.insertBefore(splitter, ref);
		}

		var scrollInnerBox = document.getAnonymousNodes(b.mTabContainer.mTabstrip._scrollbox)[0];
		var allTabsButton = document.getAnonymousElementByAttribute(b.mTabContainer, 'class', 'tabs-alltabs-button');

		// Tab Mix Plus
		var scrollFrame = document.getAnonymousElementByAttribute(b.mTabContainer, 'id', 'scroll-tabs-frame');
		var newTabBox = document.getAnonymousElementByAttribute(b.mTabContainer, 'id', 'tabs-newbutton-box');
		var tabBarMode = this.getPref('extensions.tabmix.tabBarMode');

		this.tabbarResizing = false;

		if (pos & this.kTABBAR_VERTICAL) {
			this.positionProp         = 'screenY';
			this.sizeProp             = 'height';
			this.invertedPositionProp = 'screenX';
			this.invertedSizeProp     = 'width';

			b.mTabBox.orient = 'horizontal';
			b.mStrip.orient =
				b.mTabContainer.orient =
				b.mTabContainer.mTabstrip.orient =
				b.mTabContainer.mTabstrip.parentNode.orient = 'vertical';
			if (allTabsButton.parentNode.localName == 'hbox') { // Firefox 2
				allTabsButton.parentNode.orient = 'vertical';
				allTabsButton.parentNode.setAttribute('align', 'stretch');
			}
			allTabsButton.firstChild.setAttribute('position', 'before_start');
			b.mTabContainer.setAttribute('align', 'stretch'); // for Mac OS X
			scrollInnerBox.removeAttribute('flex');

			if (scrollFrame) { // Tab Mix Plus
				scrollFrame.parentNode.orient =
					scrollFrame.orient = 'vertical';
				newTabBox.orient = 'horizontal';
				if (tabBarMode == 2)
					this.setPref('extensions.tabmix.tabBarMode', 1);
			}

			b.mStrip.removeAttribute('width');
			b.mStrip.setAttribute('width', this.getTreePref('tabbar.width'));

			b.setAttribute(this.kMODE, 'vertical');
			if (pos == this.kTABBAR_RIGHT) {
				b.setAttribute(this.kTABBAR_POSITION, 'right');
				if (this.getTreePref('tabbar.invertUI')) {
					b.setAttribute(this.kUI_INVERTED, 'true');
					this.levelMarginProp = 'margin-right';
				}
				else {
					b.removeAttribute(this.kUI_INVERTED);
					this.levelMarginProp = 'margin-left';
				}
				window.setTimeout(function(aWidth) {
					/* in Firefox 3, the width of the rightside tab bar
					   unexpectedly becomes 0 on the startup. so, we have
					   to set the width again. */
					b.mStrip.setAttribute('width', aWidth);
					b.mTabDropIndicatorBar.setAttribute('ordinal', 1);
					b.mStrip.setAttribute('ordinal', 30);
					splitter.setAttribute('ordinal', 20);
					b.mPanelContainer.setAttribute('ordinal', 10);
					splitter.setAttribute('collapse', 'after');
				}, 0, this.getTreePref('tabbar.width'));
			}
			else {
				b.setAttribute(this.kTABBAR_POSITION, 'left');
				b.removeAttribute(this.kUI_INVERTED);
				this.levelMarginProp = 'margin-left';
				window.setTimeout(function() {
					b.mTabDropIndicatorBar.setAttribute('ordinal', 1);
					b.mStrip.setAttribute('ordinal', 10);
					splitter.setAttribute('ordinal', 20);
					b.mPanelContainer.setAttribute('ordinal', 30);
					splitter.setAttribute('collapse', 'before');
				}, 0);
			}
		}
		else {
			this.positionProp         = 'screenX';
			this.sizeProp             = 'width';
			this.invertedPositionProp = 'screenY';
			this.invertedSizeProp     = 'height';

			b.mTabBox.orient = 'vertical';
			b.mStrip.orient =
				b.mTabContainer.orient =
				b.mTabContainer.mTabstrip.orient =
				b.mTabContainer.mTabstrip.parentNode.orient = 'horizontal';
			if (allTabsButton.parentNode.localName == 'hbox') { // Firefox 2
				allTabsButton.parentNode.orient = 'horizontal';
				allTabsButton.parentNode.removeAttribute('align');
			}
			allTabsButton.firstChild.setAttribute('position', 'after_end');
			b.mTabContainer.removeAttribute('align'); // for Mac OS X
			scrollInnerBox.setAttribute('flex', 1);

			if (scrollFrame) { // Tab Mix Plus
				scrollFrame.parentNode.orient =
					scrollFrame.orient = 'horizontal';
				newTabBox.orient = 'vertical';
			}

			b.mStrip.removeAttribute('width');
			b.mPanelContainer.removeAttribute('width');

			b.setAttribute(this.kMODE, this.getTreePref('tabbar.multirow') ? 'multirow' : 'horizontal' );
			b.removeAttribute(this.kUI_INVERTED);
			if (pos == this.kTABBAR_BOTTOM) {
				b.setAttribute(this.kTABBAR_POSITION, 'bottom');
				this.levelMarginProp = 'margin-bottom';
				window.setTimeout(function() {
					b.mTabDropIndicatorBar.setAttribute('ordinal', 1);
					b.mStrip.setAttribute('ordinal', 30);
					splitter.setAttribute('ordinal', 20);
					b.mPanelContainer.setAttribute('ordinal', 10);
				}, 0);
			}
			else {
				b.setAttribute(this.kTABBAR_POSITION, 'top');
				this.levelMarginProp = 'margin-top';
				window.setTimeout(function() {
					b.mTabDropIndicatorBar.setAttribute('ordinal', 1);
					b.mStrip.setAttribute('ordinal', 10);
					splitter.setAttribute('ordinal', 20);
					b.mPanelContainer.setAttribute('ordinal', 30);
				}, 0);
			}
		}
	},
  
	destroy : function() 
	{
		this.endAutoHide();

		var b = this.mTabBrowser;

		var tabs = b.mTabContainer.childNodes;
		for (var i = 0, maxi = tabs.length; i < maxi; i++)
		{
			this.destroyTab(tabs[i]);
		}

		b.removeEventListener('TabOpen',        this, true);
		b.removeEventListener('TabClose',       this, true);
		b.removeEventListener('TabMove',        this, true);
		b.removeEventListener('SSTabRestoring', this, true);
		b.mTabContainer.removeEventListener('click', this, true);
		b.mTabContainer.removeEventListener('dblclick', this, true);
		b.mTabContainer.removeEventListener('mousedown', this, true);
		b.mTabContainer.removeEventListener('select', this, true);

		var tabContext = document.getAnonymousElementByAttribute(b, 'anonid', 'tabContextMenu');
		tabContext.removeEventListener('popupshowing', this, false);
		tabContext.removeEventListener('popuphiding', this, false);

		this.ObserverService.removeObserver(this, 'TreeStyleTab:levelMarginModified');
		this.removePrefListener(this);

		delete this.mTabBrowser;
	},
	
	destroyTab : function(aTab) 
	{
		delete aTab.__treestyletab__linkedTabBrowser;
	}
   
}; 

TreeStyleTabBrowser.prototype.__proto__ = TreeStyleTabService;
 