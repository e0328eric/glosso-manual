// Serve dist/ and start Chromium with --remote-debugging-port=9222 first.
// Optional arguments: site URL, DevTools URL. Requires Node.js 22 or newer.
// The test creates and closes its own tab; it does not use existing tabs.
import assert from "node:assert/strict";
import { referenceIndex } from "../reference-index.js";

const [siteURL = "http://127.0.0.1:8000/", devtoolsURL = "http://127.0.0.1:9222"] = process.argv.slice(2);
const response = await fetch(new URL("/json/new?about:blank", devtoolsURL), { method: "PUT" });
assert(response.ok, `Could not create browser test tab: ${response.status}`);
const tab = await response.json();
const socket = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.onopen = resolve;
  socket.onerror = reject;
});
let sequence = 0;
const pending = new Map();
const errors = [];
socket.onmessage = event => {
  const message = JSON.parse(event.data);
  if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails);
  const request = pending.get(message.id);
  if (!request) return;
  pending.delete(message.id);
  clearTimeout(request.timeout);
  if (message.error) request.reject(new Error(JSON.stringify(message.error)));
  else request.resolve(message.result);
};
function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Browser timed out: ${method}`));
    }, 10000);
    pending.set(id, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function waitFor(expression) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate(expression)) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  const state = await evaluate(`({ hash: location.hash, title: document.title, ready: document.readyState,
    references: document.querySelectorAll('.clay-reference-link').length,
    anchor: document.querySelector('.clay-symbol-anchor')?.getAttribute('href') })`);
  const history = await call("Page.getNavigationHistory");
  throw new Error(`Browser condition failed: ${expression}\nState: ${JSON.stringify(state)}\nHistory: ${JSON.stringify({ current: history.currentIndex, entries: history.entries.map(entry => entry.url) })}`);
}
const frame = () => evaluate("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
const redraw = async () => {
  await evaluate("window.dispatchEvent(new Event('resize'))");
  await frame();
};
const indexes = [
  { hash: "#/manual", title: "Language manual", link: "document.querySelector('#scene a[href=\"#/manual/6\"]')", item: "Source Text, Whitespace, and Comments" },
  { hash: "#/std", title: "Standard library", link: "[...document.querySelectorAll('#scene a')].find(link => link.textContent === 'Bindgen')", item: "Bindgen" },
];
const symbolRoute = name => {
  const index = referenceIndex.symbols.findIndex(symbol => symbol[0] === name);
  assert(index >= 0, `Missing reference symbol: ${name}`);
  return `#/std/${referenceIndex.symbols[index][4]}/item/${index}`;
};
const openRoute = symbolRoute("File.open");
const accessRoute = symbolRoute("File_Access");
const closeRoute = symbolRoute("File.close");
const referenceLinks = route => `[...document.querySelectorAll('#scene .clay-reference-link')].filter(link => link.getAttribute('href') === ${JSON.stringify(route)})`;
const signatureLink = `${referenceLinks(accessRoute)}.find(link => !link.closest('.clay-table, .clay-prose'))`;
const parameterLink = `${referenceLinks(accessRoute)}.find(link => link.closest('.clay-table'))`;
const proseLink = `${referenceLinks(closeRoute)}.find(link => link.closest('.clay-prose code'))`;
const onOpen = `location.hash === ${JSON.stringify(openRoute)} && !!(${parameterLink}) && !!(${proseLink})`;
const onAccess = `location.hash === ${JSON.stringify(accessRoute)} && document.title === 'File_Access — Glosso'`;

try {
  await call("Runtime.enable");
  await call("Page.enable");
  await call("Page.bringToFront");
  await call("Network.enable");
  await call("Network.setCacheDisabled", { cacheDisabled: true });
  for (const width of [1280, 390]) {
    await call("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
    await call("Emulation.setTouchEmulationEnabled", { enabled: width === 390 });
    for (const index of indexes) {
      await call("Page.navigate", { url: new URL(index.hash, siteURL).href });
      const onIndex = `location.hash === ${JSON.stringify(index.hash)} && document.title === ${JSON.stringify(`${index.title} — Glosso`)}`;
      await waitFor(onIndex);
      const point = await evaluate(`(() => {
        const link = ${index.link};
        link.scrollIntoView({ block: 'center' });
        window.navigationTestLink = link;
        const bounds = link.getBoundingClientRect();
        return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2, href: link.getAttribute('href') };
      })()`);
      const mouse = type => call("Input.dispatchMouseEvent", { type, x: point.x, y: point.y, button: "left", clickCount: 1 });
      await mouse("mousePressed");
      // Reproduce a hover/highlighter/resize frame arriving while the link is
      // pressed. Replacing it here loses the browser's subsequent click.
      await redraw();
      assert(await evaluate("navigationTestLink.isConnected"), `${index.hash}: redraw replaced the pressed link`);
      await mouse("mouseReleased");
      const onItem = `location.hash === ${JSON.stringify(point.href)} && document.title === ${JSON.stringify(`${index.item} — Glosso`)}`;
      await waitFor(onItem);
      await evaluate("history.back()");
      await waitFor(onIndex);

      if (width === 390) {
        const touch = await evaluate(`(() => {
          const link = ${index.link}; link.scrollIntoView({ block: 'center' });
          const bounds = link.getBoundingClientRect();
          return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
        })()`);
        await call("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [touch] });
        await redraw();
        await call("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await waitFor(onItem);
        await evaluate("history.back()");
        await waitFor(onIndex);
      }

      await evaluate(`(${index.link}).focus()`);
      await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r", unmodifiedText: "\r" });
      await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
      await waitFor(onItem);
      await evaluate("history.back()");
      await waitFor(onIndex);

      // Releasing outside a link must also resume rendering, even when the
      // browser emits no click. A later resize should replace the old nodes.
      const cancelPoint = await evaluate(`(() => {
        const link = ${index.link}; link.scrollIntoView({ block: 'center' });
        window.navigationTestLink = link;
        const bounds = link.getBoundingClientRect();
        return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
      })()`);
      await call("Input.dispatchMouseEvent", { type: "mousePressed", ...cancelPoint, button: "left", clickCount: 1 });
      await redraw();
      await call("Input.dispatchMouseEvent", { type: "mouseReleased", x: width - 25, y: 70, button: "left", clickCount: 1 });
      await frame();
      await redraw();
      assert(!await evaluate("navigationTestLink.isConnected"), "Rendering remained paused after a cancelled click");
      assert(await evaluate(onIndex), "Releasing outside the link navigated unexpectedly");
    }
    console.log(`Index navigation passed at ${width}px: held mouse clicks during redraw, keyboard, Back, cancelled clicks${width === 390 ? ", and touch taps" : ""}.`);

    await call("Page.navigate", { url: new URL(openRoute, siteURL).href });
    await waitFor(onOpen);
    assert(await evaluate(`!!(${signatureLink})`), "Signature types have no documentation links");
    for (const name of ["File_Permissions", "Open_Disposition", "Open_Flags", "AsView", "Path_View"]) {
      assert(await evaluate(`${referenceLinks(symbolRoute(name))}.some(link => link.closest('.clay-table'))`),
        `Missing parameter type/default/constraint link: ${name}`);
    }
    assert(await evaluate(`(() => {
      const result = [...document.querySelectorAll('#scene .clay-text')].find(node => node.textContent === 'Fs_Error!File');
      return result?.querySelectorAll('.clay-reference-link').length === 2;
    })()`), "Both return types must link to documentation");
    assert(!await evaluate("!!document.querySelector('#scene a a, #scene button a')"), "Reference links must not nest inside controls");

    const referencePoint = await evaluate(`(() => {
      const link = ${signatureLink};
      link.scrollIntoView({ block: 'center', inline: 'center' });
      window.navigationTestLink = link;
      const bounds = link.getBoundingClientRect();
      return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    })()`);
    await call("Input.dispatchMouseEvent", { type: "mousePressed", ...referencePoint, button: "left", clickCount: 1 });
    await redraw();
    assert(await evaluate("navigationTestLink.isConnected"), "Redraw replaced a pressed inline link");
    await call("Input.dispatchMouseEvent", { type: "mouseReleased", ...referencePoint, button: "left", clickCount: 1 });
    await waitFor(onAccess);
    await evaluate("window.referenceReloadMarker = true");
    await call("Page.reload");
    await waitFor(`(${onAccess}) && !window.referenceReloadMarker`);
    await evaluate("history.back()");
    await waitFor(onOpen);

    // The same type occurs in several places. A redraw must keep focus on
    // this parameter-table occurrence rather than moving to the signature.
    await evaluate(`(${parameterLink}).focus()`);
    await redraw();
    assert(await evaluate(`document.activeElement === (${parameterLink})`), "Redraw moved focus to a different occurrence of the link");
    await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r", unmodifiedText: "\r" });
    await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
    await waitFor(onAccess);
    await evaluate("history.back()");
    await waitFor(onOpen);

    // Reproduce a redraw between popstate and the later hashchange event.
    // replaceState supplies the changed URL without firing hashchange itself.
    for (const [route, ready] of [[accessRoute, onAccess], [openRoute, onOpen]]) {
      await evaluate(`history.replaceState(null, '', ${JSON.stringify(route)}); window.dispatchEvent(new PopStateEvent('popstate'))`);
      await redraw();
      await waitFor(ready);
    }

    const methodPoint = await evaluate(`(() => {
      const link = ${proseLink};
      link.scrollIntoView({ block: 'center', inline: 'center' });
      const bounds = link.getBoundingClientRect();
      return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    })()`);
    if (width === 390) {
      await call("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [methodPoint] });
      await redraw();
      await call("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    } else {
      await call("Input.dispatchMouseEvent", { type: "mousePressed", ...methodPoint, button: "left", clickCount: 1 });
      await call("Input.dispatchMouseEvent", { type: "mouseReleased", ...methodPoint, button: "left", clickCount: 1 });
    }
    await waitFor(`location.hash === ${JSON.stringify(closeRoute)} && document.querySelector('.clay-symbol-anchor')?.getAttribute('href') === ${JSON.stringify(closeRoute)}`);
    console.log(`Reference navigation passed at ${width}px: signatures, return types, parameter details, prose methods, mouse, keyboard focus, reload, Back${width === 390 ? ", and touch" : ""}.`);
  }
  assert.equal(errors.length, 0, JSON.stringify(errors));
} finally {
  socket.close();
  for (const request of pending.values()) clearTimeout(request.timeout);
  await fetch(new URL(`/json/close/${tab.id}`, devtoolsURL));
}
