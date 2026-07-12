import re

with open('src/utils/apiClient.ts', 'r') as f:
    content = f.read()

apiclient_old = """    // Merge signals for timing out
    let signalToUse = fetchOptions.signal;
    if (!signalToUse) {
      signalToUse = controller.signal;
    } else {
      // Listen to timeout controller if user did not abort first
      signalToUse.addEventListener('abort', () => clearTimeout(id));
    }"""

apiclient_new = """    // Merge signals for timing out
    let signalToUse = fetchOptions.signal;
    if (!signalToUse) {
      signalToUse = controller.signal;
    } else if (typeof AbortSignal !== 'undefined' && 'any' in AbortSignal) {
      signalToUse = AbortSignal.any([fetchOptions.signal, controller.signal]);
      signalToUse.addEventListener('abort', () => clearTimeout(id));
    } else {
      // Polyfill behavior for AbortSignal.any if unsupported
      const combinedController = new AbortController();
      fetchOptions.signal.addEventListener('abort', () => combinedController.abort());
      controller.signal.addEventListener('abort', () => combinedController.abort());
      signalToUse = combinedController.signal;
    }"""

content = content.replace(apiclient_old, apiclient_new)

with open('src/utils/apiClient.ts', 'w') as f:
    f.write(content)
