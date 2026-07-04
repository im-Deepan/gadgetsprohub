async function apiFetch() {
  const p = Promise.reject(new Error("test"));
  p.catch(() => {});
  const returnedPromise = p.then(res => res).finally(() => {});
  returnedPromise.catch(() => {});
  return returnedPromise;
}

// Caller calls and catches
apiFetch().catch(() => {
  console.log("Caller caught!");
});

setTimeout(() => console.log("done"), 100);
