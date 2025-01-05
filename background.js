const ENABLED_KEY = "isEnabled";

async function setEnabled(isEnabled) {
  await chrome.storage.sync.set({ [ENABLED_KEY]: isEnabled });
  chrome.action.setBadgeText({ text: isEnabled ? "ON" : "OFF" });

  const tabs = await chrome.tabs.query({ url: "https://x.com/*" });
  tabs.forEach((tab) => {
    chrome.tabs
      .sendMessage(tab.id, {
        action: "toggled",
        data: isEnabled,
      })
      .catch((err) => {
        console.error("Error sending message:", err);
      });
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  await setEnabled(true);
});

chrome.action.onClicked.addListener(async () => {
  const data = await chrome.storage.sync.get(ENABLED_KEY);
  const isEnabled = data[ENABLED_KEY];
  await setEnabled(!isEnabled);
});
