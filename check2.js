function foo() {
  const p1 = Promise.reject("err");
  p1.catch(() => {});
  return p1;
}
foo();
setTimeout(() => console.log("done"), 100);
