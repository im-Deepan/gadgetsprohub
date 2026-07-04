function foo() {
  const p1 = Promise.reject("err");
  p1.catch(() => {});
  return p1;
}
foo().then(() => console.log("success"));
setTimeout(() => console.log("done"), 100);
