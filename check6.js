async function apiFetch() {
  const p = Promise.reject("err");
  p.catch(() => {});
  return p;
}
apiFetch();
setTimeout(() => console.log("done"), 100);
