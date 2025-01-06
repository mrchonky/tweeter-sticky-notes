const ENABLED_KEY = "isEnabled";
const USERNAME_REGEX = /@[a-zA-Z0-9._-]+/;
const USER_NOTE_CLASS = "user-notefwe98f7aw9efa9ew7fzsefawf"; // unique class for easy selection

/** @type MutationObserver|null */
let observer = null;

window.addEventListener("load", async () => {
  const data = await chrome.storage.sync.get(ENABLED_KEY);
  const isEnabled = data[ENABLED_KEY];

  if (isEnabled) {
    processTweets();
    observeTimeline();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const isEnabled = message.data;

  if (!isEnabled) {
    if (observer) {
      observer.disconnect();
      observer = null;
    }

    document
      .querySelectorAll(`.${USER_NOTE_CLASS}`)
      .forEach((note) => note.remove());

    document.querySelectorAll('[data-testid="tweet"]').forEach((tweet) => {
      delete tweet.dataset.processed;
    });

    return;
  }

  processTweets();
  observeTimeline();
});

function processTweets() {
  const tweets = document.querySelectorAll('[data-testid="tweet"]');
  tweets.forEach((tweet) => {
    if (!tweet.dataset.processed) {
      tweet.dataset.processed = "true";

      const username = _getMatchingText(tweet, USERNAME_REGEX);

      chrome.storage.sync.get(username, (data) => {
        const note = data[username];

        if (!note) {
          return;
        }

        const p = document.createElement("p");
        p.innerText = `(${note})`;
        p.style.marginTop = "12px";
        p.style.marginBottom = 0;
        p.style.marginLeft = "64px";
        p.style.fontFamily = "TwitterChirp, sans-serif";
        p.classList.add(USER_NOTE_CLASS);

        tweet.insertAdjacentElement("beforebegin", p);
      });
    }
  });
}

function observeTimeline() {
  if (observer) {
    observer.disconnect();
  }

  const targetNode = document.body;
  observer = new MutationObserver((mutationsList) => {
    _handleDropdown(mutationsList);
    processTweets();
  });

  observer.observe(targetNode, {
    childList: true,
    subtree: true,
  });
}

function _handleDropdown(mutationsList) {
  for (const mutation of mutationsList) {
    if (mutation.type === "childList") {
      const menu = document.querySelector('[role="menu"]');
      if (menu && !menu.dataset.processed) {
        menu.dataset.processed = "true";

        const username = _getMatchingText(menu, USERNAME_REGEX);
        const color = (function () {
          const usernameNode = _findFirstMatchingChild(menu, USERNAME_REGEX);
          return getComputedStyle(usernameNode).color;
        })();

        chrome.storage.sync.get(username, (data) => {
          const note = data[username];

          let btnText;
          let clickHandler;

          if (!note) {
            btnText = `Sticky note ${username}`;
            clickHandler = function () {
              // menu.remove();
              _clickOut();

              const newNote = window.prompt(
                `Add a sticky note for ${username}`,
              );

              if (newNote === null || newNote.trim() === "") {
                return;
              }

              _updateStickyNote(username, newNote);
            };
          } else {
            btnText = "Delete sticky note";
            clickHandler = function () {
              // menu.remove();
              _clickOut();

              _updateStickyNote(username, null);
            };
          }

          const wrapper = document.createElement("div");

          const addTagBtn = `
            <div role="menuitem" tabindex="0" class="css-175oi2r r-1loqt21 r-18u37iz r-1mmae3n r-3pj75a r-13qz1uu r-o7ynqc r-6416eg r-1ny4l3l">
                <div class="css-175oi2r r-1777fci r-faml9v">
                    <svg width="24px" height="24px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <g>
                            <path fill="none" d="M0 0h24v24H0z"/>
                            <path d="M15.728 9.686l-1.414-1.414L5 17.586V19h1.414l9.314-9.314zm1.414-1.414l1.414-1.414-1.414-1.414-1.414 1.414 1.414 1.414zM7.242 21H3v-4.243L16.435 3.322a1 1 0 0 1 1.414 0l2.829 2.829a1 1 0 0 1 0 1.414L7.243 21z"/>
                        </g>
                    </svg>
                </div>
                ${btnText}
            </div>
        `;
          wrapper.style.display = "flex";
          wrapper.style.alignItems = "center";
          wrapper.style.width = "100%";
          wrapper.innerHTML = addTagBtn;
          wrapper.style.fontFamily = "TwitterChirp, sans-serif";
          wrapper.style.fontWeight = 600;
          wrapper.style.color = color;

          menu
            .querySelector('[role="menuitem"]')
            .insertAdjacentElement("afterend", wrapper);

          const svg = wrapper.querySelector("svg");
          svg.style.fill = color;
          svg.style.width = "18.25px";
          svg.style.height = "18.25px";
          svg.style.flexShrink = 0;

          wrapper.addEventListener("click", clickHandler);
        });
      }
    }
  }
}

function _updateStickyNote(username, note) {
  chrome.storage.sync.set({ [username]: note }, () => {
    const tweets = document.querySelectorAll('[data-testid="tweet"]');
    tweets.forEach((tweet) => {
      delete tweet.dataset.processed;

      const noteElement = _findMatchingSibling(tweet, `.${USER_NOTE_CLASS}`);
      if (noteElement) {
        noteElement.remove();
      }
    });

    processTweets();
  });
}

// simulates clicking out of the tweet menu to remove overlays
function _clickOut() {
  const x = 0;
  const y = 0;

  const el = document.elementFromPoint(x, y);
  if (el) {
    el.click();
  }
}

function _getMatchingText(parentNode, regexPattern) {
  // Recursively search for matching text in all descendants of parentNode
  function __searchDescendants(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const textContent = node.textContent.trim();

      const matches = textContent.match(regexPattern);

      if (matches) {
        return matches[0];
      }
    }

    for (const child of node.childNodes) {
      const result = __searchDescendants(child);
      if (result) {
        return result;
      }
    }

    return null;
  }

  return __searchDescendants(parentNode);
}

function _findFirstMatchingChild(parentNode, regexPattern) {
  // Recursively search for the first element node that contains matching text
  function __searchDescendants(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const textContent = node.textContent.trim();
      if (textContent.match(regexPattern)) {
        return node.parentElement;
      }
    }

    for (const child of node.childNodes) {
      const result = __searchDescendants(child);
      if (result) {
        return result;
      }
    }

    return null;
  }

  return __searchDescendants(parentNode);
}

function _findFirstMatchingParent(node, selector) {
  let currentNode = node.parentNode;

  while (currentNode) {
    if (currentNode.matches(selector)) {
      return currentNode;
    }
    currentNode = currentNode.parentNode;
  }

  return null;
}

function _findMatchingSibling(element, selector) {
  let sibling = element.nextElementSibling;
  while (sibling) {
    if (sibling.matches(selector)) {
      return sibling;
    }
    sibling = sibling.nextElementSibling;
  }

  sibling = element.previousElementSibling;
  while (sibling) {
    if (sibling.matches(selector)) {
      return sibling;
    }
    sibling = sibling.previousElementSibling;
  }

  return null;
}
