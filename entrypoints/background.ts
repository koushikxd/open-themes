export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === "fetch_css") {
      fetch(message.url)
        .then(res => res.text())
        .then(text => sendResponse({ success: true, css: text }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
    }
  });
});
