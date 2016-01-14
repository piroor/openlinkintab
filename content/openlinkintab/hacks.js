OpenLinkInTabService.overrideExtensions = function OLITService_overrideExtensions() {

	// Tab Mix Plus
	if (this.utils.getMyPref('compatibility.TMP') &&
		'TMupdateSettings' in window) {

		eval('window.TMP_contentAreaClick = '+
			window.TMP_contentAreaClick.toSource().replace(
				'if (openT)',
				'if (OpenLinkInTabService.utils.checkReadyToOpenNewTabFromLink(linkNode)) {\n' +
				'  event.stopPropagation();\n' +
				'  event.preventDefault();\n' +
				'  handleLinkClick(event, linkNode.href, linkNode);\n' +
				'  return true;\n' +
				'} else $&\n'
			)
		);
		if (/\(?function TMP_contentAreaClick\(/.test(window.contentAreaClick.toSource()))
			window.contentAreaClick = window.TMP_contentAreaClick;
	}

};
