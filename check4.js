function test() {
  const p = Promise.reject("err");
  const p2 = p.finally(() => {});
  p2.catch(() => {});
  return p2;
}
test();
setTimeout(() => console.log("done"), 100);
