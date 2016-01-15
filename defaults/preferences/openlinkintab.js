pref("extensions.openlinkintab@piro.sakura.ne.jp.openOuterLinkInNewTab", false);
pref("extensions.openlinkintab@piro.sakura.ne.jp.openOuterLinkInNewTab.asChild", true);
pref("extensions.openlinkintab@piro.sakura.ne.jp.openAnyLinkInNewTab", false);
pref("extensions.openlinkintab@piro.sakura.ne.jp.openAnyLinkInNewTab.asChild", false);
pref("extensions.openlinkintab@piro.sakura.ne.jp.useEffectiveTLD", true);
pref("extensions.openlinkintab@piro.sakura.ne.jp.checkUserHome", true);

/**
 * If you set this to true, contentAreaClick() will be called at the capturing
 * phase for webpages under domains specified by "handleEventsBeforeWebPages.domains".
 */
pref("extensions.openlinkintab@piro.sakura.ne.jp.handleEventsBeforeWebPages", true);
/**
 * Matcher for domains to call contentAreaClick() at the capturing phase.
 * Wildcards "*" and "?" are available. Moreover, you can list multiple rules
 * joined with "," or any whitespace.
 */
pref("extensions.openlinkintab@piro.sakura.ne.jp.handleEventsBeforeWebPages.domains", "*.google.*");

pref("browser.link.open_newwindow.restriction.override", 0);

pref("extensions.openlinkintab@piro.sakura.ne.jp.compatibility.TMP", true); // Tab Mix Plus

pref("extensions.openlinkintab@piro.sakura.ne.jp.debug", false);

